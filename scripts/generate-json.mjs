import fs from "node:fs/promises";

const {
  AIRTABLE_TOKEN,
  AIRTABLE_BASE_ID,
  AIRTABLE_TABLE_ID,
} = process.env;

if (!AIRTABLE_TOKEN) {
  throw new Error("AIRTABLE_TOKEN is missing.");
}

if (!AIRTABLE_BASE_ID) {
  throw new Error("AIRTABLE_BASE_ID is missing.");
}

if (!AIRTABLE_TABLE_ID) {
  throw new Error("AIRTABLE_TABLE_ID is missing.");
}

const airtableRecords = [];
let offset;

do {
  const url = new URL(
    `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`
  );

  /*
   * Optional:
   * You can choose the order in which Airtable returns the records.
   */
  url.searchParams.set("sort[0][field]", "Unit ID");
  url.searchParams.set("sort[0][direction]", "asc");

  if (offset) {
    url.searchParams.set("offset", offset);
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `Airtable request failed (${response.status}): ${errorBody}`
    );
  }

  const data = await response.json();

  airtableRecords.push(...data.records);
  offset = data.offset;
} while (offset);

/*
 * Convert Airtable field names into cleaner JSON property names.
 *
 * The names inside record.fields["..."] must match your
 * Airtable field names exactly.
 */
const properties = airtableRecords
  .map((record) => {
    const fields = record.fields;

    return {
      unitId: fields["Unit ID"] ?? "",
      projectName: fields["Project name"] ?? "",
      availabilityStatus: fields["Availability status"] ?? "",
      currentPrice: fields["Current price"] ?? "",
      propertyType: fields["Property type"] ?? "",
    };
  })
  /*
   * Do not place incomplete records on the website.
   */
  .filter((property) => property.unitId !== "");

/*
 * Sort the final JSON by Unit ID.
 */
properties.sort((a, b) =>
  String(a.unitId).localeCompare(String(b.unitId), undefined, {
    numeric: true,
  })
);

await fs.mkdir("./data", {
  recursive: true,
});

await fs.writeFile(
  "./data/properties.json",
  JSON.stringify(properties, null, 2) + "\n",
  "utf8"
);

console.log(
  `Generated data/properties.json with ${properties.length} properties.`
);
