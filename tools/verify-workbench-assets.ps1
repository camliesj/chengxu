Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root "public\assets\ui\workbench\icons"

Get-ChildItem -File (Join-Path $iconDir "*.png") | ForEach-Object {
  $bmp = [System.Drawing.Bitmap]::FromFile($_.FullName)
  $corner = $bmp.GetPixel(0, 0).A
  $center = $bmp.GetPixel([int]($bmp.Width / 2), [int]($bmp.Height / 2)).A
  [PSCustomObject]@{
    File = $_.Name
    Width = $bmp.Width
    Height = $bmp.Height
    CornerAlpha = $corner
    CenterAlpha = $center
  }
  $bmp.Dispose()
} | Format-Table -AutoSize
