package main

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"unicode"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	COLORS_FILE_VER      = "13.0"
	COLORS_META_FILE_VER = "1.0"
)

var bkpColorGroups []ColorGroup

// App struct
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// returns empty string if no file was chosen
func (a *App) OpenFileDialog() (string, error) {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{})
	if err != nil {
		fmt.Printf("file open error: %e\n", err)
	} else {
		fmt.Printf("chosen file: %s\n", file)
	}
	return file, err
}

func (a *App) OpenImgFileDialog() (string, error) {
	file, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select image file",
		Filters: []runtime.FileFilter{
			{
				DisplayName: "Images (*.png;*.jpg)",
				Pattern:     "*.png;*.jpg",
			},
		},
	})
	if err != nil {
		return "", err
	}
	return file, err
}

type Color struct {
	Rgb         [3]uint8 `json:"rgb"`
	Alpha       float32  `json:"alpha"`
	Description string   `json:"description"`
	Img         string   `json:"img"`
}

func NewColor(rgb [3]uint8, alpha float32, descr string, img string) *Color {
	return &Color{
		Rgb:         rgb,
		Alpha:       alpha,
		Description: descr,
		Img:         img,
	}
}

// colorspace:
// 0 - rgb
// 1 - hsv
type ColorGroup struct {
	Name       string   `json:"name"`
	Colorspace int      `json:"colorspace"`
	Colors     []*Color `json:"colors"`
}

// colorspace:
// 0 - rgb
// 1 - hsv
func NewColorGroup(name string, colorspace int, colors []*Color) *ColorGroup {
	return &ColorGroup{
		Name:       name,
		Colorspace: colorspace,
		Colors:     colors,
	}
}

// photoshop file json layout reflected as go struct
type ColorsFile struct {
	Name    string              `json:"Name"`
	Version string              `json:"Version"`
	Colors  map[string][][4]any `json:"Colors"`
}

func NewColorsFile(colors []ColorGroup) *ColorsFile {
	colorsMap := make(map[string][][4]any, len(colors))
	for _, colorGroup := range colors {
		colorsArr := make([][4]any, 0, 10)
		for _, color := range colorGroup.Colors {
			rgba := [4]any{color.Rgb[0], color.Rgb[1], color.Rgb[2], color.Alpha}
			colorsArr = append(colorsArr, rgba)
		}
		colorsMap[colorGroup.Name] = colorsArr
	}
	return &ColorsFile{
		Name:    "Photoshop Color Values",
		Version: COLORS_FILE_VER,
		Colors:  colorsMap,
	}
}

type ColorsMetaFile struct {
	Name        string       `json:"Name"`
	Version     string       `json:"Version"`
	ColorGroups []ColorGroup `json:"ColorGroups"`
}

func newColorsMetaFile(colorGroups []ColorGroup) *ColorsMetaFile {
	return &ColorsMetaFile{
		Name:        "Colors metadata",
		Version:     COLORS_META_FILE_VER,
		ColorGroups: colorGroups,
	}
}

// excpects color digit to be valid uint8 or float32
func parseColorDigit(digit string) (*uint8, *float32, error) {
	i, err := strconv.ParseUint(digit, 10, 8)
	if err != nil {
		fl, err := strconv.ParseFloat(digit, 32)
		if err != nil {
			return nil, nil, err
		}
		fl32 := float32(fl)
		return nil, &fl32, nil
	}
	ui8 := uint8(i)
	return &ui8, nil, nil
}

// expects  "0, 255, 255, 1.0" as runes
func parseColor(colorRunes []rune) (*Color, error) {
	rgb := [3]uint8{}
	var alpha float32
	strDigits := strings.Split(string(colorRunes), ",")
	if len(strDigits) != 4 {
		return nil, errors.New("wrong color format")
	}
	for i, sd := range strDigits {
		u, f, err := parseColorDigit(sd)
		if err != nil {
			return nil, err
		}
		if u != nil {
			rgb[i] = *u
		}
		if f != nil {
			alpha = *f
		}
	}
	// TODO add description instead of empty string
	return NewColor(rgb, alpha, "", ""), nil
}

// expects
//
//	[ 0, 255, 255, 1.0 ],
//	[ 0, 255, 255, 1.0 ],
//	[ 0, 255, 255, 1.0 ],
//	[ 0, 255, 255, 1.0 ]
//
// as runes
func readColorsGroup(group []rune, cgName string) (*ColorGroup, error) {
	colors := make([]*Color, 0, 20)
	var brackets int16 = 0
	colorStart := 0

	for i, r := range group {
		if r == '\t' || r == '\n' || r == ' ' {
			continue
		}
		if brackets == 1 {
			// inside color array
		}
		if r == '[' {
			brackets++
			if brackets > 1 {
				return nil, fmt.Errorf(
					"bad file format, too many square brackets opened: %d", brackets)
			}
			if brackets == 1 {
				colorStart = i + 1
			}
		}
		if r == ']' {
			brackets--
			if brackets < 0 {
				return nil, fmt.Errorf(
					"bad file format, too many square brackets closed: %d", brackets)
			}
		}
		// if brackets == 1 {

		// }
		if brackets == 0 {
			// color array ended
			color, err := parseColor(group[colorStart:i])
			if err != nil {
				return nil, err
			}
			colors = append(colors, color)
		}
	}

	// TODO hardcoded rgb
	return NewColorGroup(cgName, 0, colors), nil

}

func parseColorFile(reader io.RuneReader) ([]ColorGroup, error) {
	groups := make([]ColorGroup, 0, 50)
	groupRunes := make([]rune, 0, 1000)
	groupNameRunes := make([]rune, 0, 100)
	var curlyBrackets int = 0
	var squareBrackets int = 0

	// search start of the colors block
	for {
		r, _, err := reader.ReadRune()
		if err != nil {
			if err == io.EOF {
				return nil, errors.New("not found start of the colors section in a file")
			}
			return nil, err
		}
		if r == '{' {
			curlyBrackets++
		}
		if curlyBrackets == 2 {
			break
		}
	}

	// read blocks
parseLoop:
	for {
		groupNameRunes = groupNameRunes[:0]
		// read name
		for {
			r, _, err := reader.ReadRune()
			if err != nil {
				if err == io.EOF {
					return nil, errors.New("end of file while excpecting color group name")
				}
				return nil, err
			}
			if r == '}' {
				break parseLoop
			}
			if r == ':' {
				break
			}
			if unicode.IsLetter(r) {
				groupNameRunes = append(groupNameRunes, r)
			}
		}

		// read colors, i.e [[...], ...]
		squareBrackets = 0
		groupRunes = groupRunes[:0]
		for {
			r, _, err := reader.ReadRune()
			if err != nil {
				if err == io.EOF {
					return nil, errors.New("end of file while excpecting colors array")
				}
				return nil, err
			}
			if r == '\t' || r == '\n' || r == ' ' {
				continue
			}
			if r == '[' {
				squareBrackets++
			}
			if squareBrackets > 1 {
				groupRunes = append(groupRunes, r)
			}
			if r == ']' {
				squareBrackets--
				// end of colors array
				if squareBrackets == 0 {
					break
				}
			}
		}
		colorGroup, err := readColorsGroup(groupRunes, string(groupNameRunes))
		if err != nil {
			return nil, err
		}
		groups = append(groups, *colorGroup)
	}

	return groups, nil
}

func createBackupFile(f *os.File) error {
	bkpname := filepath.Join(
		filepath.Dir(f.Name()),
		fmt.Sprintf("%s.bkp", filepath.Base(f.Name())))
	out, err := os.Create(bkpname)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, f)
	if err != nil {
		return err
	}
	err = out.Sync()
	return err
}

// return colors saved in memory from the last loaded file
func (a *App) ColorsBackupRestore() ([]ColorGroup, error) {
	if bkpColorGroups == nil {
		return bkpColorGroups, errors.New("no backup colors saved")
	}
	return bkpColorGroups, nil
}

type ColorsFileLoadResult struct {
	ColorGroups []ColorGroup `json:"colorGroups"`
	LoadedFile  string       `json:"file"`
}

func parseMetaFile(filename string) (*ColorsMetaFile, error) {
	metafile := &ColorsMetaFile{}
	content, err := os.ReadFile(filename)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(content, metafile)
	if err != nil {
		return nil, err
	}
	return metafile, nil
}

// returns empty string and no error if no file was chosen
func (a *App) LoadColorsFile() (*ColorsFileLoadResult, error) {
	selectedFile, err := a.OpenFileDialog()
	if err != nil {
		return &ColorsFileLoadResult{nil, selectedFile}, err
	}
	// no file chosen
	if selectedFile == "" {
		return &ColorsFileLoadResult{nil, selectedFile}, nil
	}
	// try loading color groups from meta file with the same name as colors file first.
	// if meta file exist - load color groups from there, otherwise open selected colors file
	sdir, sfile := filepath.Split(selectedFile)
	sfile = strings.TrimSuffix(sfile, filepath.Ext(sfile))
	metafilename := fmt.Sprintf("%s.meta.json", filepath.Join(sdir, sfile))

	var colorGroups []ColorGroup
	if _, err := os.Stat(metafilename); err == nil {
		metafile, err := parseMetaFile(metafilename)
		if err != nil {
			fmt.Printf("error parsing meta file %s", metafilename)
			return nil, err
		}
		colorGroups = metafile.ColorGroups
	} else {
		file, err := os.Open(selectedFile)
		if err != nil {
			return nil, err
		}
		defer file.Close()
		reader := bufio.NewReader(file)
		colorGroups, err = parseColorFile(reader)
		if err != nil {
			return nil, err
		}
		// create file backup just in case
		file.Seek(0, io.SeekStart)
		err = createBackupFile(file)
		if err != nil {
			return nil, err
		}
	}
	// store in-memory backup to restore original colors on demand
	bkpColorGroups = colorGroups
	return &ColorsFileLoadResult{colorGroups, selectedFile}, nil
}

func writeColorsFile(filename string, colors []ColorGroup) error {
	// open file block
	f, err := os.Create(fmt.Sprintf("%s.txt", filename))
	if err != nil {
		return err
	}
	defer f.Close()
	w := bufio.NewWriter(f)
	_, err = w.WriteString("{\n")
	if err != nil {
		return err
	}
	_, err = w.WriteString(
		"Name: \"Photoshop Color Values\",\nVersion: 13.0,\n",
	)
	if err != nil {
		return err
	}
	err = w.Flush()
	if err != nil {
		return err
	}
	// open colors block
	_, err = w.WriteString("Colors:\n\t{\n\t")
	if err != nil {
		return err
	}
	for i, group := range colors {
		_, err = fmt.Fprintf(w, "%s:\n\t\t[\n\t\t", group.Name)
		if err != nil {
			return err
		}
		for i, color := range group.Colors {
			delim := ","
			if i == len(group.Colors)-1 {
				delim = ""
			}
			r, g, b := color.Rgb[0], color.Rgb[1], color.Rgb[2]
			_, err = fmt.Fprintf(w, "[ %d, %d, %d, %.1f ]%s\n\t\t", r, g, b, color.Alpha, delim)
			if err != nil {
				return err
			}
		}
		delim := ","
		if i == len(colors)-1 {
			delim = ""
		}
		_, err = fmt.Fprintf(w, "]%s\n\n\t", delim)
		if err != nil {
			return err
		}
		err = w.Flush()
		if err != nil {
			return err
		}
	}
	// close colors block
	_, err = w.WriteString("}\n")
	if err != nil {
		return err
	}
	// close file block
	_, err = w.WriteString("}\n")
	if err != nil {
		return err
	}
	err = w.Flush()
	if err != nil {
		return err
	}
	return nil
}

func writeColorsFileJson(filename string, colors []ColorGroup) error {
	f, err := os.Create(fmt.Sprintf("%s.json", filename))
	if err != nil {
		return err
	}
	defer f.Close()
	jsonData, err := json.Marshal(NewColorsFile(colors))
	if err != nil {
		return err
	}
	_, err = f.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}

func writeColorsMetaFileJson(filename string, colorGroups []ColorGroup) error {
	f, err := os.Create(fmt.Sprintf("%s.meta.json", filename))
	if err != nil {
		return err
	}
	defer f.Close()
	jsonData, err := json.MarshalIndent(newColorsMetaFile(colorGroups), "", "  ")
	if err != nil {
		return err
	}
	_, err = f.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}

func StashImg(img string, dir string) (string, error) {
	os.MkdirAll(dir, os.ModePerm)
	dst := filepath.Join(dir, filepath.Base(img))
	srcfile, err := os.Open(img)
	if err != nil {
		return "", err
	}
	defer srcfile.Close()
	dstfile, err := os.Create(dst)
	if err != nil {
		return "", err
	}
	defer dstfile.Close()
	_, err = io.Copy(dstfile, srcfile)
	return dst, err
}

func imgDirFromFilename(filename string) string {
	return filepath.Join(filepath.Dir(filename), "colors_images")
}

func (a *App) StashImgByFilename(img string, filename string) (string, error) {
	imagesDir := imgDirFromFilename(filename)
	err := os.MkdirAll(imagesDir, os.ModePerm)
	if err != nil {
		return "", err
	}
	return StashImg(img, imagesDir)
}

func writeStaticFiles(filename string, colorGroups []ColorGroup) error {
	// save images
	colorsDir := imgDirFromFilename(filename)
	err := os.MkdirAll(colorsDir, os.ModePerm)
	if err != nil {
		return err
	}
	for _, group := range colorGroups {
		for _, color := range group.Colors {
			if color.Img != "" {
				StashImg(color.Img, colorsDir)
			}
		}
	}
	return nil
}

func (a *App) OverwriteColorsFiles(filename string, colors []ColorGroup) error {
	filename = strings.TrimSuffix(filename, filepath.Ext(filename))
	err := writeColorsFile(filename, colors)
	if err != nil {
		return err
	}
	err = writeColorsMetaFileJson(filename, colors)
	return err
}

// main function to save current state of the colors from the app to disk
func (a *App) SaveColors(filename string, colors []ColorGroup) error {
	// main photoshop colors file
	err := writeColorsFile(filename, colors)
	if err != nil {
		return err
	}
	err = writeStaticFiles(filename, colors)
	if err != nil {
		return err
	}
	// meta info: desc, screenshots path, etc.
	err = writeColorsMetaFileJson(filename, colors)
	if err != nil {
		return err
	}
	// json format main photoshop colors file
	err = writeColorsFileJson(filename, colors)
	if err != nil {
		return err
	}
	return nil
}

type SaveColorsDialogResult struct {
	SavedFile string `json:"savedFile"`
	Error     error  `json:"error"`
}

func (a *App) SaveColorsDialog(colors []ColorGroup) SaveColorsDialogResult {
	filename, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{})
	if err != nil {
		return SaveColorsDialogResult{"", err}
	}
	if filename == "" {
		return SaveColorsDialogResult{"", nil}
	}
	err = a.SaveColors(filename, colors)
	if err != nil {
		return SaveColorsDialogResult{"", err}
	}
	return SaveColorsDialogResult{filename, nil}
}
