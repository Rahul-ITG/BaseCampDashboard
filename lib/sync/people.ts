import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getPeople } from "@/lib/basecamp/endpoints";

export async function syncPeople(client: BasecampClient): Promise<number> {
  const people = await getPeople(client);
  let count = 0;

  // Only sync actual users (not clients, bots, etc.)
  const activeUsers = people.filter(
    (p) => p.personable_type === "User"
  );

  const syncedIds: bigint[] = [];

  for (const person of activeUsers) {
    await prisma.person.upsert({
      where: { basecampId: person.id },
      update: {
        name: person.name,
        email: person.email_address,
        avatarUrl: person.avatar_url,
        admin: person.admin,
      },
      create: {
        basecampId: person.id,
        name: person.name,
        email: person.email_address,
        avatarUrl: person.avatar_url,
        admin: person.admin,
      },
    });
    syncedIds.push(BigInt(person.id));
    count++;
  }

  // Remove non-User people from previous syncs
  if (syncedIds.length > 0) {
    const deleted = await prisma.person.deleteMany({
      where: { basecampId: { notIn: syncedIds } },
    });
    if (deleted.count > 0) {
      console.log(`[sync] Cleaned up ${deleted.count} non-user people`);
    }
  }

  console.log(`[sync] Synced ${count} people (filtered from ${people.length} total)`);
  return count;
}
