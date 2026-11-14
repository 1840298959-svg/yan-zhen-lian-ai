#requires -Version 7.0
param(
    [Parameter(Mandatory)] [string] $OutputDirectory,
    [Parameter(Mandatory)] [string] $WebViewPackage,
    [Parameter(Mandatory)] [string] $NodeLicense,
    [string] $NodeExe = (Get-Command node.exe).Source
)

$ErrorActionPreference = 'Stop'
$PSNativeCommandUseErrorActionPreference = $true
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$dist = Join-Path $repo '.next-desktop'
$output = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutputDirectory)
$sdkPackage = (Resolve-Path -LiteralPath $WebViewPackage).Path
$license = (Resolve-Path -LiteralPath $NodeLicense).Path
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$nodeInfo = & $NodeExe -p 'process.platform + "/" + process.arch'
if ($nodeInfo -ne 'win32/x64') {
    throw 'The Windows x64 Node.js executable is required.'
}
if (Test-Path -LiteralPath $output) {
    throw 'Provide a new output directory for the portable package.'
}

New-Item -ItemType Directory -Path $output | Out-Null
$app = New-Item -ItemType Directory -Path (Join-Path $output 'app')
$runtime = New-Item -ItemType Directory -Path (Join-Path $output 'runtime')
$notices = New-Item -ItemType Directory -Path (Join-Path $output 'licenses')
$projectLicense = Join-Path $repo 'LICENSE'
if (Test-Path -LiteralPath $projectLicense -PathType Leaf) {
    Copy-Item -LiteralPath $projectLicense -Destination $output
}

Push-Location $repo
$savedEnv = @{
    DATABASE_URL = $env:DATABASE_URL
    OPENAI_API_KEY = $env:OPENAI_API_KEY
    OPENAI_BASE_URL = $env:OPENAI_BASE_URL
    OPENAI_MODEL = $env:OPENAI_MODEL
    YZL_DESKTOP_BUILD = $env:YZL_DESKTOP_BUILD
    NEXT_TELEMETRY_DISABLED = $env:NEXT_TELEMETRY_DISABLED
}
try {
    $demo = Join-Path $app 'demo.db'
    $env:DATABASE_URL = 'file:' + $demo.Replace('\', '/').Replace('%', '%25').Replace('#', '%23').Replace('?', '%3F')
    $env:OPENAI_API_KEY = ' '
    $env:OPENAI_BASE_URL = ' '
    $env:OPENAI_MODEL = ' '
    $env:YZL_DESKTOP_BUILD = '1'
    $env:NEXT_TELEMETRY_DISABLED = '1'
    $sql = & $NodeExe node_modules/prisma/build/index.js migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
    $schemaFile = Join-Path $output 'demo-schema.sql'
    $sql | Set-Content -LiteralPath $schemaFile -Encoding utf8
    & $NodeExe --disable-warning=ExperimentalWarning -e "const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(process.argv[1]); db.exec(require('node:fs').readFileSync(process.argv[2], 'utf8')); db.close();" -- $demo $schemaFile
    Remove-Item -LiteralPath $schemaFile
    & $NodeExe --import tsx prisma/seed.ts
    & $NodeExe node_modules/next/dist/bin/next build --webpack

    $standalone = Join-Path $dist 'standalone'
    # Next's tracing output can contain dotenv files. Copy only the runtime inputs.
    foreach ($name in '.next-desktop', 'node_modules', 'package.json') {
        Copy-Item -LiteralPath (Join-Path $standalone $name) -Destination $app.FullName -Recurse
    }
    Copy-Item -LiteralPath (Join-Path $dist 'static') -Destination (Join-Path $app '.next-desktop/static') -Recurse
    Copy-Item -LiteralPath (Join-Path $repo 'public') -Destination $app.FullName -Recurse
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'server.cjs') -Destination (Join-Path $app 'desktop-server.cjs')
    $unexpected = Get-ChildItem -LiteralPath $app -File -Recurse -Force | Where-Object {
        $_.FullName -ne $demo -and
        ($_.Name -like '.env*' -or $_.Name -match '\.(db|sqlite|sqlite3)(-wal|-shm|-journal)?$')
    }
    if ($unexpected) {
        throw 'A traced runtime file matched a private configuration or database pattern.'
    }

    $modules = Join-Path $app 'node_modules'
    foreach ($manifest in Get-ChildItem -LiteralPath $modules -Filter 'package.json' -File -Recurse) {
        $relative = [IO.Path]::GetRelativePath($modules, $manifest.DirectoryName)
        $source = Join-Path $repo (Join-Path 'node_modules' $relative)
        if (-not (Test-Path -LiteralPath $source)) { continue }
        $packageNotices = Get-ChildItem -LiteralPath $source -File | Where-Object {
            $_.Name -match '^(LICENSE|LICENCE|COPYING|NOTICE)(\.|$)'
        }
        if (-not $packageNotices) { continue }
        $packageDir = New-Item -ItemType Directory -Force -Path (Join-Path $notices $relative)
        $packageNotices | Copy-Item -Destination $packageDir.FullName
    }
    Copy-Item -LiteralPath $NodeExe -Destination (Join-Path $runtime 'node.exe')
    Copy-Item -LiteralPath $license -Destination (Join-Path $notices 'Node.js.txt')

    $core = 'lib/net462/Microsoft.Web.WebView2.Core.dll'
    $forms = 'lib/net462/Microsoft.Web.WebView2.WinForms.dll'
    $loader = 'runtimes/win-x64/native/WebView2Loader.dll'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $sdk = [IO.Compression.ZipFile]::OpenRead($sdkPackage)
    try {
        $entries = [ordered]@{
            $core = Join-Path $output 'Microsoft.Web.WebView2.Core.dll'
            $forms = Join-Path $output 'Microsoft.Web.WebView2.WinForms.dll'
            $loader = Join-Path $output 'WebView2Loader.dll'
            'LICENSE.txt' = Join-Path $notices 'WebView2-License.txt'
            'NOTICE.txt' = Join-Path $notices 'WebView2-Notice.txt'
        }
        foreach ($entry in $entries.GetEnumerator()) {
            [IO.Compression.ZipFileExtensions]::ExtractToFile($sdk.GetEntry($entry.Key), $entry.Value)
        }
    } finally {
        $sdk.Dispose()
    }

    $exe = Join-Path $output '验真链 AI.exe'
    $references = @(
        'System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll', 'System.Security.dll'
        $entries[$core], $entries[$forms]
    ) | ForEach-Object { "/reference:$_" }
    & $compiler /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/out:$exe" @references (Join-Path $PSScriptRoot 'Workbench.cs')

    @'
验真链 AI · Windows 单人工作台（x64）

请完整解压整个文件夹，双击「验真链 AI.exe」打开。首次启动时可用内置的模拟项目体验。
程序自带本地服务。关闭窗口会结束该服务。Windows 需要 Microsoft Edge WebView2 运行时。

新建项目和上传的原件保存在当前 Windows 用户下的 %LOCALAPPDATA%\YanZhenLianAI。
点击窗口上方的「打开数据目录」可查看数据。备份前请关闭程序，再复制 workbench.db 和 storage 文件夹。

人工工作台可在本机使用。若要使用 AI，点击「AI 设置」填写接口、模型和自己的 API 密钥。
启用后，分析所需的材料内容将发送到所选模型的在线接口。
'@ | Set-Content -LiteralPath (Join-Path $output '使用说明.txt') -Encoding utf8BOM
} finally {
    foreach ($name in $savedEnv.Keys) {
        [Environment]::SetEnvironmentVariable($name, $savedEnv[$name], 'Process')
    }
    Pop-Location
}
