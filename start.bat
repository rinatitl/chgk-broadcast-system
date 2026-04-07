@echo off
title CHGK BROADCAST SYSTEM
color 0e
cd /d "%~dp0"

:: --- [1] ЗАПУСК СЕРВЕРА ---
echo [1/3] Starting NodeCG Server...
tasklist /nh /fi "imagename eq node.exe" | find /i "node.exe" >nul
if %errorlevel% neq 0 (
    start "CHGK Server" cmd /k "npx nodecg start"
    timeout /t 5 /nobreak >nul
)

:: --- [2] ПОИСК ПУТЕЙ БРАУЗЕРОВ ---
:: Ищем Яндекс в разных местах
set YANDEX_EXE=""
if exist "%LOCALAPPDATA%\Yandex\YandexBrowser\Application\browser.exe" set YANDEX_EXE="%LOCALAPPDATA%\Yandex\YandexBrowser\Application\browser.exe"
if exist "%ProgramFiles(x86)%\Yandex\YandexBrowser\Application\browser.exe" set YANDEX_EXE="%ProgramFiles(x86)%\Yandex\YandexBrowser\Application\browser.exe"

:: Ищем Chrome
set CHROME_EXE=""
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" set CHROME_EXE="C:\Program Files\Google\Chrome\Application\chrome.exe"
if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" set CHROME_EXE="C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set CHROME_EXE="%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

:: --- [3] ЗАПУСК ДАШБОРДА (Яндекс) ---
echo [2/3] Opening Dashboard...
if not %YANDEX_EXE% == "" (
    start "" %YANDEX_EXE% --app="http://localhost:9090/dashboard"
) else (
    start http://localhost:9090/dashboard
)

:: --- [4] ЗАПУСК ГРАФИКИ (Chrome) ---
echo [3/3] Opening Graphics...
:: Если второго экрана нет, убери или закомментируй --window-position
:: Пока оставим 0,0 чтобы ты видел окно на основном мониторе
if not %CHROME_EXE% == "" (
    start "" %CHROME_EXE% ^
      --app="http://localhost:9090/bundles/chgk-main/graphics/index.html" ^
      --window-position=0,0 ^
      --window-size=1920,1080 ^
      --autoplay-policy=no-user-gesture-required ^
      --user-data-dir="%CD%\chrome_profile_graphics" ^
      --no-first-run
) else (
    echo ERROR: Chrome NOT FOUND! Please install Google Chrome.
    pause
)

echo.
echo All systems go!
timeout /t 5
exit