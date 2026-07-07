import dotenv from "dotenv";
dotenv.config();

async function fetchBaseSchema() {
  const baseId = process.env.AIRTABLE_BASE_ID;
  const pat = process.env.AIRTABLE_PAT;

  if (!baseId || !pat) {
    console.error("Missing environment variables.");
    return;
  }

  const url = `https://api.airtable.com/v0/meta/bases/${baseId}/tables`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${pat}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`HTTP Error: ${response.status}`, errorText);
      return;
    }

    const data = (await response.json()) as {
      tables: Array<{
        id: string;
        name: string;
        primaryFieldId: string;
        fields: Array<{
          id: string;
          type: string;
          name: string;
          options?: any;
        }>;
      }>;
    };

    console.log("TABLES_FOUND:");
    data.tables.forEach((table) => {
      console.log(`- Table: ${table.name} (${table.id})`);
      table.fields.forEach((f) => {
        console.log(`  * ${f.name} (${f.type})`);
      });
    });
  } catch (error) {
    console.error("Error fetching schema:", error);
  }
}

fetchBaseSchema();
