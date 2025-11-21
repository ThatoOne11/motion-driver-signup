// Centralized Airtable field mapping for the driver-profile function.
// Replace the placeholder field IDs (fld_...) with your actual Airtable field IDs.

export type AirtableFieldMap = {
  fullName: string;
  email: string;
  phone: string;
  secondaryPhone?: string;
  motionId: string;
  province: string;
  platforms: string;
  bikeOwnership: string;
  yearsDriving: string;
  daysPerWeek: string;
};


export const AIRTABLE_FIELDS: AirtableFieldMap = {
  fullName: "fldHZDl1BpYSCW2t0",
  email: "fldcsVO3Po3RuAXOh",
  phone: "fldDGcjd67j7NuhLl",
  secondaryPhone: "fldYtNSWlPwwgsG7b",
  motionId: "fldc7VDZmhzXDIQHA",
  province: "fldyL5hfNi66vHvd5",
  platforms: "fldH5IecuS2Hw4tIS",
  bikeOwnership: "fldCLNLtY8mT92L12",
  yearsDriving: "fldkQS1o7ljF2lG2b",
  daysPerWeek: "fldwQv1CMnw0MAPh1",
};

export const AIRTABLE_READONLY_FIELD_IDS: string[] = [AIRTABLE_FIELDS.motionId];

// Convenience alias for the Airtable auto-number "Driver ID" field we read back
export const AIRTABLE_DRIVER_ID_FIELD_ID = AIRTABLE_FIELDS.motionId;

// USERS TABLE MAPPING (Airtable Users flow)
export type AirtableUsersFieldMap = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
};

// Fill these with actual field IDs from your Airtable Users table
export const AIRTABLE_USERS_FIELDS: AirtableUsersFieldMap = {
  fullName: "fldoNNTmA8K39IcFf",
  email: "fldUynqX0l6zvU6KB",
  phone: "fldRR8QsVfDPa7Tkv",
  city: "fldPdDmdd1SDcP3xB",
};
