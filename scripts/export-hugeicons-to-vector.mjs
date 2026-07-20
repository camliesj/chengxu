import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import add from '@hugeicons/core-free-icons/Add01Icon';
import arrowRight from '@hugeicons/core-free-icons/ArrowRight01Icon';
import building from '@hugeicons/core-free-icons/Building01Icon';
import calendar from '@hugeicons/core-free-icons/Calendar01Icon';
import car from '@hugeicons/core-free-icons/Car01Icon';
import check from '@hugeicons/core-free-icons/CheckmarkCircle02Icon';
import chevronDown from '@hugeicons/core-free-icons/ArrowDown01Icon';
import close from '@hugeicons/core-free-icons/Cancel01Icon';
import cloud from '@hugeicons/core-free-icons/CloudIcon';
import eye from '@hugeicons/core-free-icons/ViewIcon';
import eyeOff from '@hugeicons/core-free-icons/ViewOffSlashIcon';
import home from '@hugeicons/core-free-icons/Home01Icon';
import lock from '@hugeicons/core-free-icons/LockIcon';
import logout from '@hugeicons/core-free-icons/Logout01Icon';
import offline from '@hugeicons/core-free-icons/WifiOff01Icon';
import orders from '@hugeicons/core-free-icons/Invoice01Icon';
import profile from '@hugeicons/core-free-icons/UserCircleIcon';
import records from '@hugeicons/core-free-icons/File02Icon';
import refresh from '@hugeicons/core-free-icons/RefreshIcon';
import shield from '@hugeicons/core-free-icons/Shield01Icon';
import tools from '@hugeicons/core-free-icons/ToolsIcon';
import user from '@hugeicons/core-free-icons/UserIcon';
import wallet from '@hugeicons/core-free-icons/Wallet01Icon';
import warning from '@hugeicons/core-free-icons/Alert02Icon';

export const ICON_SPECS = Object.freeze([
  ['add', add],
  ['arrow_right', arrowRight],
  ['building', building],
  ['calendar', calendar],
  ['car', car],
  ['check', check],
  ['chevron_down', chevronDown],
  ['close', close],
  ['cloud', cloud],
  ['eye', eye],
  ['eye_off', eyeOff],
  ['home', home],
  ['lock', lock],
  ['logout', logout],
  ['offline', offline],
  ['orders', orders],
  ['profile', profile],
  ['records', records],
  ['refresh', refresh],
  ['shield', shield],
  ['tools', tools],
  ['user', user],
  ['wallet', wallet],
  ['warning', warning],
].map(([name, nodes]) => Object.freeze({ name, nodes })));

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function circleToPath(cx, cy, radius) {
  const left = cx - radius;
  const right = cx + radius;
  return `M ${left} ${cy} A ${radius} ${radius} 0 1 0 ${right} ${cy} A ${radius} ${radius} 0 1 0 ${left} ${cy}`;
}

function vectorPath([tag, attributes]) {
  if (tag !== 'path' && tag !== 'circle') {
    throw new Error(`Unsupported Hugeicons node: ${tag}`);
  }
  const pathData = tag === 'path'
    ? attributes.d
    : circleToPath(Number(attributes.cx), Number(attributes.cy), Number(attributes.r));
  return `    <path android:fillColor="@android:color/transparent" android:pathData="${escapeXml(pathData)}" android:strokeColor="#FF000000" android:strokeLineCap="${attributes.strokeLinecap ?? 'round'}" android:strokeLineJoin="${attributes.strokeLinejoin ?? 'round'}" android:strokeWidth="${attributes.strokeWidth ?? '1.5'}" />`;
}

export function renderVectorDrawable(nodes) {
  const paths = nodes.map(vectorPath).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">\n${paths}\n</vector>\n`;
}

export async function writeVectorDrawables(outputDirectory, specs = ICON_SPECS) {
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all(specs.map(({ name, nodes }) => writeFile(
    path.join(outputDirectory, `brand_icon_${name}.xml`),
    renderVectorDrawable(nodes),
    'utf8',
  )));
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  await writeVectorDrawables(
    path.resolve('android-client/app/src/main/res/drawable'),
    ICON_SPECS,
  );
}
