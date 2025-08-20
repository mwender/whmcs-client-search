import { showHUD, getPreferenceValues, environment } from "@raycast/api";
import fetch from "node-fetch";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Preferences = {
  whmcsApiUrl: string;
  whmcsApiIdentifier: string;
  whmcsApiSecret: string;
  whmcsAdminPath: string;
};

async function whmcsApiRequest(prefs: Preferences, action: string, params: Record<string, string | number> = {}) {
  const body = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    identifier: prefs.whmcsApiIdentifier,
    secret: prefs.whmcsApiSecret,
    action,
    responsetype: "json",
  });

  const response = await fetch(prefs.whmcsApiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status}`);
  }

  const data = await response.json();

  if (data?.result && String(data.result).toLowerCase() === "error") {
    throw new Error(`WHMCS API Error: ${data.message ?? "Unknown"}`);
  }

  return data;
}

export default async function main() {
  try {
    const prefs = getPreferenceValues<Preferences>();

    // Fetch clients
    const response = await whmcsApiRequest(prefs, "GetClients", { limitnum: 5000 });

    if (!response?.clients?.client) {
      throw new Error("No clients found in response");
    }

    const adminPath = prefs.whmcsAdminPath.replace(/\/$/, ""); // trim trailing slash

    // Map and normalize clients
    const clients = response.clients.client.map((c: any) => {
      const firstname = String(c.firstname ?? "").trim();
      const lastname = String(c.lastname ?? "").trim();
      const id = String(c.id);

      return {
        id,
        firstname,
        lastname,
        name: `${lastname}, ${firstname}`, // for display/sorting
        email: c.email,
        company: c.companyname,
        urls: {
          profile: `${adminPath}/clientssummary.php?userid=${id}`,
          billable: `${adminPath}/clientsbillableitems.php?userid=${id}`,
        },
      };
    });

    // Sort alphabetically by "Lastname, Firstname"
    clients.sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Use Raycast's persistent support path
    const dataDir = environment.supportPath;
    await mkdir(dataDir, { recursive: true });

    // Full path to clients.json
    const filePath = path.join(dataDir, "clients.json");

    // Write clients.json
    await writeFile(filePath, JSON.stringify(clients, null, 2), "utf-8");

    // Log the path so you can see it in the dev console
    console.log(`✅ Clients saved to: ${filePath}`);

    await showHUD(`Synced ${clients.length} clients ✅`);
  } catch (error) {
    console.error(error);
    await showHUD(`Sync failed: ${String(error)}`);
  }
}
