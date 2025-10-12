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

type Color struct {
	Rgb         [3]uint8 `json:"rgb"`
	Alpha       float32  `json:"alpha"`
	Description string   `json:"description"`
}

func NewColor(rgb [3]uint8, alpha float32, descr string) *Color {
	return &Color{
		Rgb:         rgb,
		Alpha:       alpha,
		Description: descr,
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
	Name    string                `json:"Name"`
	Version string                `json:"Version"`
	Colors  map[string][][4]uint8 `json:"Colors"`
}

func NewColorsFile(colors []ColorGroup) *ColorsFile {
	colorsMap := make(map[string][][4]uint8, len(colors))
	for _, colorGroup := range colors {
		colorsArr := make([][4]uint8, 0, 4)
		for _, color := range colorGroup.Colors {
			rgba := [4]uint8{color.Rgb[0], color.Rgb[1], color.Rgb[2], uint8(color.Alpha)}
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
	Name        string              `json:"Name"`
	Version     string              `json:"Version"`
	Description map[string][]string `json:"Description"`
}

func newColorsMetaFile(colors []ColorGroup) *ColorsMetaFile {
	colorsDescMap := make(map[string][]string, len(colors))
	for _, colorGroup := range colors {
		colorsDescArr := make([]string, 0, len(colorGroup.Colors))
		for _, color := range colorGroup.Colors {
			if color.Description != "" {
				colorsDescArr = append(colorsDescArr, color.Description)
			}
		}
		colorsDescMap[colorGroup.Name] = colorsDescArr
	}
	return &ColorsMetaFile{
		Name:        "Colors metadata",
		Version:     COLORS_META_FILE_VER,
		Description: colorsDescMap,
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
	return NewColor(rgb, alpha, ""), nil
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

		// read colors
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
					colorGroup, err := readColorsGroup(groupRunes, string(groupNameRunes))
					if err != nil {
						return nil, err
					}
					groups = append(groups, *colorGroup)
					break
				}
			}
		}
	}

	return groups, nil
}

// returns empty string and no error if no file was chosen
func (a *App) LoadColorsFile() ([]ColorGroup, error) {
	selectedFile, err := a.OpenFileDialog()
	if err != nil {
		return nil, err
	}
	// no file chosen
	if selectedFile == "" {
		return nil, nil
	}
	file, err := os.Open(selectedFile)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	reader := bufio.NewReader(file)
	colorGroups, err := parseColorFile(reader)
	if err != nil {
		return nil, err
	}
	return colorGroups, nil
}

func writeColorsFile(w *bufio.Writer, colors []ColorGroup) error {
	// open file block
	_, err := w.WriteString("{\n")
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
	for _, group := range colors {
		_, err = w.WriteString(fmt.Sprintf(
			"%s:\n\t\t[\n\t\t", group.Name))
		if err != nil {
			return err
		}
		for _, color := range group.Colors {
			r, g, b := color.Rgb[0], color.Rgb[1], color.Rgb[2]
			_, err = w.WriteString(fmt.Sprintf(
				"[ %d, %d, %d, %.1f ],\n\t\t", r, g, b, color.Alpha))
			if err != nil {
				return err
			}
		}
		_, err = w.WriteString("],\n\n\t")
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

func writeColorsFileJson(file *os.File, colors []ColorGroup) error {
	jsonData, err := json.Marshal(NewColorsFile(colors))
	if err != nil {
		return err
	}
	_, err = file.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}

func writeColorsMetaFileJson(file *os.File, colors []ColorGroup) error {
	jsonData, err := json.MarshalIndent(newColorsMetaFile(colors), "", "  ")
	if err != nil {
		return err
	}
	_, err = file.Write(jsonData)
	if err != nil {
		return err
	}
	return nil
}

func (a *App) SaveColors(colors []ColorGroup) error {
	filename := "colors"
	saveDir, err := runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{})
	if err != nil {
		return err
	}
	if saveDir == "" {
		return nil
	}
	// write photoshop colors file
	f, err := os.Create(filepath.Join(saveDir, fmt.Sprintf("%s.txt", filename)))
	if err != nil {
		return err
	}
	defer f.Close()
	w := bufio.NewWriter(f)
	err = writeColorsFile(w, colors)
	if err != nil {
		return err
	}
	// write colors description file
	f, err = os.Create((filepath.Join(saveDir, fmt.Sprintf("%s.meta.txt", filename))))
	if err != nil {
		return err
	}
	defer f.Close()
	err = writeColorsMetaFileJson(f, colors)
	if err != nil {
		return err
	}
	return nil
}
