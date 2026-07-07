import Airtable from "airtable";

if (!process.env.AIRTABLE_PAT) {
  throw new Error("Missing AIRTABLE_PAT environment variable in .env");
}

if (!process.env.AIRTABLE_BASE_ID) {
  throw new Error("Missing AIRTABLE_BASE_ID environment variable in .env");
}

export const airtableBase = new Airtable({
  apiKey: process.env.AIRTABLE_PAT,
}).base(process.env.AIRTABLE_BASE_ID);
