import { showHUD, getPreferenceValues, environment, LaunchType, LaunchProps } from "@raycast/api";
import fetch from "node-fetch";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type Preferences = {
  whmcsApiUrl: string;
  whmcsApiIdentifier: string;
  whmcsApiSecret: string;
  whmcsAdminPath: string;
};

type Client = {
  id: string;
  firstname: string;
  lastname: string;
  name: string;
  email: string;
  company: string;
  urls: {
    profile: string;
    billable: string;
  };
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

export default async function main(props: LaunchProps<{ launchType: LaunchType }>) {
  try {
    const prefs = getPreferenceValues<Preferences>();

    // Detect modifier keys: Cmd+Return will include inactive clients
    const includeInactive = props.launchContext?.modifiers?.cmd === true;

    // Fetch clients
    const response = await whmcsApiRequest(prefs, "GetClients", { limitnum: 5000 });

    if (!response?.clients?.client) {
      throw new Error("No clients found in response");
    }

    const adminPath = prefs.whmcsAdminPath.replace(/\/$/, "");

    let clients: Client[] = response.clients.client.map((c: Record<string, unknown>): Client => {
      const firstname = String(c.firstname ?? "").trim();
      const lastname = String(c.lastname ?? "").trim();
      const id = String(c.id);

      return {
        id,
        firstname,
        lastname,
        name: `${lastname}, ${firstname}`,
        email: String(c.email ?? ""),
        company: String(c.companyname ?? ""),
        urls: {
          profile: `${adminPath}/clientssummary.php?userid=${id}`,
          billable: `${adminPath}/clientsbillableitems.php?userid=${id}`,
        },
      };
    });

    // By default, keep only Active clients
    if (!includeInactive) {
      clients = response.clients.client
        .filter((c: any) => String(c.status) === "Active")
        .map((c: Record<string, unknown>): Client => {
          const firstname = String(c.firstname ?? "").trim();
          const lastname = String(c.lastname ?? "").trim();
          const id = String(c.id);

          return {
            id,
            firstname,
            lastname,
            name: `${lastname}, ${firstname}`,
            email: String(c.email ?? ""),
            company: String(c.companyname ?? ""),
            urls: {
              profile: `${adminPath}/clientssummary.php?userid=${id}`,
              billable: `${adminPath}/clientsbillableitems.php?userid=${id}`,
            },
          };
        });
    }

    clients.sort((a: Client, b: Client) => a.name.localeCompare(b.name));

    const dataDir = environment.supportPath;
    await mkdir(dataDir, { recursive: true });
    const filePath = path.join(dataDir, "clients.json");

    await writeFile(filePath, JSON.stringify(clients, null, 2), "utf-8");

    console.log(`✅ Clients saved to: ${filePath}`);

    await showHUD(
      `Synced ${clients.length} client${clients.length === 1 ? "" : "s"}${
        includeInactive ? " (including inactive)" : ""
      } ✅`
    );
  } catch (error) {
    console.error(error);
    await showHUD(`Sync failed: ${String(error)}`);
  }
}
