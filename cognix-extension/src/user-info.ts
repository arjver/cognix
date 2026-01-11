import * as vscode from 'vscode';

export async function askUserDetails() {
    // Ask for full name
    const fullName = await vscode.window.showInputBox({
        prompt: "Enter your full name.",
        placeHolder: "First Last",
        ignoreFocusOut: true
    });

    if (!fullName) {
        vscode.window.showErrorMessage("Full name is required.");
        return;
    }

    // Ask for class
    const className = await vscode.window.showInputBox({
        prompt: "Enter your class code.",
        placeHolder: "CS24",
        ignoreFocusOut: true
    });

    if (!className) {
        vscode.window.showErrorMessage("Class is required.");
        return;
    }

    // Convert to lowercase
    const lowerFullName = fullName.toLowerCase();
    const lowerClassName = className.toLowerCase();

    // Show message
    vscode.window.showInformationMessage(`Hello ${lowerFullName}, you are in ${lowerClassName}.`);

    return { fullName: lowerFullName, className: lowerClassName };
}
