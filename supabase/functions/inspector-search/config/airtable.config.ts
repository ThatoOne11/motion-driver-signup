// Centralized Airtable field mapping for the driver-profile function.
// Replace the placeholder field IDs (fld_...) with your actual Airtable field IDs.

export type AirtableFieldMap = {
  name: string;
  email: string;
  phone: string;
  motionId: string;
};

export const AIRTABLE_FIELDS: AirtableFieldMap = {
  name: "fldHZDl1BpYSCW2t0",
  email: "fldcsVO3Po3RuAXOh",
  phone: "fldYtNSWlPwwgsG7b",
  motionId: "fldc7VDZmhzXDIQHA",
};

export const AIRTABLE_FALLBACK_PHONE_FIELD = "fldDGcjd67j7NuhLl";

export const AIRTABLE_DRIVER_CAMPAIGN_STATUS_FIELD = "fld3Z5AFn1Buoq63B";
export const AIRTABLE_DRIVER_CAMPAIGN_ID_FIELD = "fldhIamd9ZmqvOA1C";

export const AIRTABLE_CAMPAIGNS_TABLE_ID = "tbl0uY9e9KHGX0OKo";
export const AIRTABLE_CAMPAIGNS_VIEW_ID = "viwwaD1KeMVNWaXHE";
export const AIRTABLE_CAMPAIGN_NAME_FIELD = "fldmJC5ASNyvLpQGz";
