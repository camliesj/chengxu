Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$iconDir = Join-Path $root "public\assets\ui\workbench\icons"
$bgDir = Join-Path $root "public\assets\ui\workbench\backgrounds"
New-Item -ItemType Directory -Force -Path $iconDir | Out-Null
New-Item -ItemType Directory -Force -Path $bgDir | Out-Null

function New-Bitmap($w, $h, $transparent = $true) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  if ($transparent) {
    $g.Clear([System.Drawing.Color]::Transparent)
  } else {
    $g.Clear([System.Drawing.Color]::White)
  }
  return @($bmp, $g)
}

function Save-Png($bmp, $g, $path) {
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}

function Color($hex) {
  return [System.Drawing.ColorTranslator]::FromHtml($hex)
}

function PenC($hex, $width) {
  $pen = New-Object System.Drawing.Pen (Color $hex), $width
  $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
  return $pen
}

function BrushC($hex) {
  return New-Object System.Drawing.SolidBrush (Color $hex)
}

function Draw-TransparentIcon($name, $kind, $primary, $secondary) {
  $pair = New-Bitmap 128 128 $true
  $bmp = $pair[0]
  $g = $pair[1]
  $p = PenC $primary 7
  $p2 = PenC $secondary 6
  $b = BrushC $primary
  $b2 = BrushC $secondary
  $thin = PenC $primary 5

  switch ($kind) {
    "revenue" {
      $font = New-Object System.Drawing.Font "Arial", 56, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)
      $g.DrawString("¥", $font, $b, 34, 24)
      $g.DrawLine($p2, 35, 90, 93, 90)
    }
    "count" {
      $g.DrawRectangle($p, 31, 47, 66, 40)
      $g.DrawEllipse($p, 38, 76, 18, 18)
      $g.DrawEllipse($p, 72, 76, 18, 18)
      $g.DrawLine($p2, 43, 47, 53, 32)
      $g.DrawLine($p2, 53, 32, 75, 32)
      $g.DrawLine($p2, 75, 32, 86, 47)
    }
    "pending" {
      $g.DrawRectangle($p, 38, 24, 52, 78)
      $g.DrawLine($p2, 50, 45, 77, 45)
      $g.DrawLine($p2, 50, 62, 77, 62)
      $g.DrawLine($p2, 50, 79, 68, 79)
    }
    "repairing" {
      $g.DrawLine($p, 40, 88, 88, 40)
      $g.DrawLine($p, 35, 39, 52, 56)
      $g.DrawLine($p, 76, 87, 91, 102)
      $g.DrawLine($p2, 83, 33, 98, 18)
      $g.DrawLine($p2, 29, 96, 17, 109)
    }
    "insurance" {
      $points = @(
        [System.Drawing.Point]::new(64, 18),
        [System.Drawing.Point]::new(96, 32),
        [System.Drawing.Point]::new(90, 80),
        [System.Drawing.Point]::new(64, 108),
        [System.Drawing.Point]::new(38, 80),
        [System.Drawing.Point]::new(32, 32)
      )
      $g.DrawPolygon($p, $points)
      $g.DrawLine($p2, 49, 64, 61, 78)
      $g.DrawLine($p2, 61, 78, 82, 52)
    }
    "todo" {
      $g.DrawEllipse($p, 24, 24, 80, 80)
      $g.DrawLine($p2, 64, 38, 64, 68)
      $g.FillEllipse($b2, 59, 82, 10, 10)
    }
    "refresh" {
      $g.DrawArc($p, 29, 29, 70, 70, 35, 250)
      $g.DrawLine($p, 87, 26, 101, 32)
      $g.DrawLine($p, 87, 26, 84, 42)
      $g.DrawArc($p2, 29, 29, 70, 70, 210, 120)
    }
    "workflow" {
      $g.DrawLine($p, 23, 64, 105, 64)
      $g.FillEllipse($b, 20, 52, 24, 24)
      $g.FillEllipse($b2, 52, 52, 24, 24)
      $g.FillEllipse($b, 84, 52, 24, 24)
      $g.DrawLine($thin, 96, 52, 108, 64)
      $g.DrawLine($thin, 96, 76, 108, 64)
    }
    "trend" {
      $g.DrawLine($thin, 24, 96, 104, 96)
      $g.DrawLine($thin, 24, 96, 24, 28)
      $pts = @(
        [System.Drawing.Point]::new(30, 82),
        [System.Drawing.Point]::new(48, 68),
        [System.Drawing.Point]::new(63, 74),
        [System.Drawing.Point]::new(79, 45),
        [System.Drawing.Point]::new(101, 36)
      )
      $g.DrawLines($p, $pts)
      foreach ($pt in $pts) { $g.FillEllipse($b2, $pt.X - 4, $pt.Y - 4, 8, 8) }
    }
    "donut" {
      $g.DrawArc((PenC $primary 13), 30, 30, 68, 68, -90, 250)
      $g.DrawArc((PenC $secondary 13), 30, 30, 68, 68, 166, 90)
      $g.DrawEllipse($thin, 44, 44, 40, 40)
    }
    "cost" {
      $g.DrawRectangle($p, 24, 30, 80, 68)
      $g.DrawLine($p2, 24, 52, 104, 52)
      $g.DrawString("¥", (New-Object System.Drawing.Font "Arial", 32, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)), $b, 52, 55)
    }
    "table" {
      $g.DrawRectangle($p, 25, 30, 78, 68)
      $g.DrawLine($p2, 25, 52, 103, 52)
      $g.DrawLine($p2, 25, 75, 103, 75)
      $g.DrawLine($p2, 51, 30, 51, 98)
      $g.DrawLine($p2, 77, 30, 77, 98)
    }
    "empty" {
      $g.DrawRectangle($p, 38, 25, 52, 72)
      $g.DrawLine($p2, 50, 48, 78, 48)
      $g.DrawLine($p2, 50, 64, 78, 64)
      $g.DrawLine($p2, 50, 80, 66, 80)
    }
  }

  $path = Join-Path $iconDir "$name.png"
  Save-Png $bmp $g $path
}

function Draw-Background($name, $w, $h, $base, $accent, $accent2) {
  $pair = New-Bitmap $w $h $false
  $bmp = $pair[0]
  $g = $pair[1]
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (Color $base), (Color "#ffffff"), 90
  $g.FillRectangle($brush, $rect)
  $brush.Dispose()

  $pen1 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(42, (Color $accent))), 2
  $pen2 = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(28, (Color $accent2))), 2
  $pen1.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen1.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen2.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $pen2.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

  for ($i = -160; $i -lt $w; $i += 210) {
    $g.DrawBezier($pen1, $i, 42, $i + 120, 8, $i + 230, 92, $i + 360, 44)
    $g.DrawBezier($pen2, $i - 40, $h - 58, $i + 80, $h - 120, $i + 220, $h - 8, $i + 380, $h - 72)
  }

  $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(28, (Color $accent)))
  for ($x = 24; $x -lt $w; $x += 48) {
    for ($y = 26; $y -lt $h; $y += 48) {
      $g.FillEllipse($dotBrush, $x, $y, 2, 2)
    }
  }

  $path = Join-Path $bgDir "$name.png"
  Save-Png $bmp $g $path
}

$blue = "#087bef"
$green = "#16a263"
$orange = "#f08300"
$red = "#ef3d32"
$navy = "#193452"
$slate = "#7b8b9b"

Draw-TransparentIcon "wb-metric-revenue" "revenue" $blue "#39bdf2"
Draw-TransparentIcon "wb-metric-count" "count" $blue "#39bdf2"
Draw-TransparentIcon "wb-metric-pending" "pending" $orange "#ffc066"
Draw-TransparentIcon "wb-metric-repairing" "repairing" $green "#5ed79a"
Draw-TransparentIcon "wb-metric-insurance" "insurance" $red "#ff8a7b"
Draw-TransparentIcon "wb-todo-alert" "todo" $red "#ff9a12"
Draw-TransparentIcon "wb-action-refresh" "refresh" $blue "#39bdf2"
Draw-TransparentIcon "wb-flow-workflow" "workflow" $blue $green
Draw-TransparentIcon "wb-chart-trend" "trend" $blue "#39bdf2"
Draw-TransparentIcon "wb-chart-status" "donut" $blue $green
Draw-TransparentIcon "wb-chart-cost" "cost" $green $blue
Draw-TransparentIcon "wb-table-orders" "table" $navy "#8cb3dc"
Draw-TransparentIcon "wb-empty-state" "empty" $slate "#c4d2df"

Draw-Background "wb-hero-panel-bg" 1600 300 "#f5fbff" "#087bef" "#16a263"
Draw-Background "wb-card-flow-bg" 900 420 "#f7fbff" "#39bdf2" "#087bef"
Draw-Background "wb-analysis-panel-bg" 1200 520 "#ffffff" "#087bef" "#16a263"

Write-Host "Generated workbench assets:"
Get-ChildItem -File $iconDir, $bgDir | Select-Object FullName, Length | Format-Table -AutoSize
