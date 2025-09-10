package main

import (
	"context"
	"errors"
	"fmt"

	"github.com/wailsapp/wails/v2/pkg/runtime"
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

// returns empty string and no error if no file was chosen
func (a *App) LoadColorsFile() (string, error) {
	selectedFile, err := a.OpenFileDialog()
	if err != nil {
		return "", err
	}
	// no file chosen
	if selectedFile == "" {
		return "", nil
	}
	content, err := ParseColorFile(selectedFile)
	if err != nil {
		return "", errors.New("error parsing colors file")
	}

	return content, nil
}
