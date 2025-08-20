import { List, ActionPanel, Action, Icon, environment } from "@raycast/api";
import { useEffect, useState } from "react";
import fs from "fs/promises";
import path from "path";
import Fuse from "fuse.js";

type Client = {
  id: string;
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
  const [filtered, setFiltered] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fuse, setFuse] = useState<Fuse<Client> | null>(null);
  const [hasError, setHasError] = useState(false);

  async function loadClients() {
    try {
      const filePath = path.join(environment.supportPath, "clients.json");
      const contents = await fs.readFile(filePath, "utf-8");
      const parsed: Client[] = JSON.parse(contents);

      setClients(parsed);
      setFiltered(parsed);

      const fuseInstance = new Fuse(parsed, {
        keys: ["name", "email", "company"],
        threshold: 0.3,
      });
      setFuse(fuseInstance);
      setHasError(false);
    } catch (error) {
      console.error("Failed to load clients.json:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function handleSearch(query: string) {
    if (!fuse || query.trim().length === 0) {
      setFiltered(clients);
    } else {
      const results = fuse.search(query).map((r) => r.item);
      setFiltered(results);
    }
  }

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={handleSearch}
      searchBarPlaceholder="Search by name, email, or company..."
      throttle
    >
      {hasError ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="No Clients Found"
          description="It looks like clients.json is missing. Run 'Sync Clients' first."
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={loadClients} />
            </ActionPanel>
          }
        />
      ) : (
        filtered.map((client) => (
          <List.Item
            key={client.id}
            title={client.name}
            subtitle={client.company}
            accessories={[{ text: client.email }]}
            icon={Icon.Person}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Billable Items" url={client.urls.billable} />
                <Action.OpenInBrowser
                  title="Open Profile"
                  url={client.urls.profile}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action.CopyToClipboard title="Copy Email" content={client.email} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
