import { List, ActionPanel, Action, Icon, getPreferenceValues, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";

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

export default function Command() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        const filePath = path.join(environment.supportPath, "clients.json");
        const contents = await fs.readFile(filePath, "utf-8");
        const parsed: Client[] = JSON.parse(contents);
        setClients(parsed);
      } catch (error) {
        console.error("Failed to load clients.json:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadClients();
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search WHMCS Clients…">
      {clients.map((client) => (
        <List.Item
          key={client.id}
          title={client.name}
          subtitle={client.company || ""}
          accessories={[{ text: client.email }]}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Billable Items" url={client.urls.billable} />
              <Action.OpenInBrowser title="Open Profile" url={client.urls.profile} shortcut={{ modifiers: ["cmd"], key: "return" }} />
              <Action.CopyToClipboard title="Copy Email" content={client.email} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
