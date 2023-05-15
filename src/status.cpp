#include <iostream>
#include <fstream>
#include <regex>
#include <experimental/filesystem>

namespace fs = std::experimental::filesystem;

std::string findManifest(const std::string& currentPath) {
    fs::path currentDir = currentPath;
    while (!currentDir.empty()) {
        fs::path manifestPath = currentDir / ".project" / "manifest";
        if (fs::exists(manifestPath))
            return currentDir.string();
        currentDir = currentDir.parent_path();
    }
    return "";
}

std::string readValueFromFile(const std::string& filePath, const std::string& fieldName) {
    std::ifstream file(filePath);
    std::string line;
    std::regex fieldRegex("^" + fieldName + ":\\s*(.*)$");
    while (std::getline(file, line)) {
        std::smatch match;
        if (std::regex_search(line, match, fieldRegex))
            return match[1].str();
    }
    return "";
}

int main() {
    std::string projectPath = findManifest(fs::current_path().string());
    if (projectPath.empty())
        return 0;

    std::string projectName = readValueFromFile(projectPath + "/.project/manifest", "project");
    if (projectName.empty())
        return 0;

    std::string targetPath = projectPath + "/.project/.target";
    std::string targetFilePath = targetPath;
    std::string targetName = readValueFromFile(targetFilePath, "target");
    std::string stageName = readValueFromFile(targetFilePath, "stage");

    std::cout << "\033[1;36m" << projectName << "\033[0m : ";
    std::cout << (targetName.empty() ? "\033[1;33mno target\033[0m" : "\033[1;36m" + targetName + "\033[0m") << " : ";
    std::cout << (stageName.empty() ? "\033[1;33mno stage\033[0m" : "\033[1;36m" + stageName + "\033[0m") << std::endl;

    return 0;
}
