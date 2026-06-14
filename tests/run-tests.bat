@echo off
REM Run specific Playwright E2E test suites
REM Usage: run-tests [suite]
REM   suite: admin | cashier | chef | edge | all (default)

set SUITE=%1
if "%SUITE%"=="" set SUITE=all

echo === Burger House E2E Tests ===
echo Suite: %SUITE%
echo.

if "%SUITE%"=="admin" (
    npx playwright test --project=admin
) else if "%SUITE%"=="cashier" (
    npx playwright test --project=cashier
) else if "%SUITE%"=="chef" (
    npx playwright test --project=chef
) else if "%SUITE%"=="edge" (
    npx playwright test --project=edge-cases
) else if "%SUITE%"=="all" (
    npx playwright test --project=admin --project=cashier --project=chef --project=edge-cases
) else (
    echo Unknown suite: %SUITE%
    echo Usage: run-tests [admin^|cashier^|chef^|edge^|all]
    exit /b 1
)

echo.
echo === Done ===
