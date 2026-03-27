import { prisma } from "@/lib/db";
import { BasecampClient } from "@/lib/basecamp/client";
import { getPeople } from "@/lib/basecamp/endpoints";

export async function syncPeople(client: BasecampClient): Promise<number> {
  const people = await getPeople(client);
  let count = 0;

  for (const person of people) {
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
    count++;
  }

  console.log(`[sync] Synced ${count} people`);
  return count;
}
