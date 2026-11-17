@echo off
title Uploading Rah-eDeen Islam to GitHub...
echo ========================================================
echo   Rah-e-Deen-Islam GitHub Upload
echo ========================================================
echo.
echo Pushing website files to GitHub repository (Rah-eDeen-Islam)...
git push -u origin main
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  SUCCESS! All website files uploaded to GitHub:
    echo  https://github.com/taybasharif/Rah-eDeen-Islam
    echo ========================================================
) else (
    echo.
    echo --------------------------------------------------------
    echo If GitHub reports 'Repository not found', please ensure
    echo you clicked 'Create repository' on https://github.com/new
    echo.
    echo If you want to push to your existing repository (RaheDeenIslam):
    echo git push -u existing main
    echo --------------------------------------------------------
)
echo.
pause
