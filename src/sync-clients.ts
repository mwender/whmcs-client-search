import { showHUD, getPreferenceValues } from "@raycast/api";

type Preferences = {
  whmcsApiUrl: string;
  whmcsApiIdentifier: string;
  whmcsApiSecret: string;
  whmcsAdminPath: string;
};

export default async function main() {
  // Read the preferences
  const prefs = getPreferenceValues<Preferences>();

  // For testing: show one of them in the HUD
  await showHUD(`WHMCS API URL: ${prefs.whmcsApiUrl}`);

  // (Later we’ll use prefs.whmcsApiIdentifier, prefs.whmcsApiSecret, etc. 
  // to actually call the WHMCS API.)
}
