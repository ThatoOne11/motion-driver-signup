export type InspectorSearchType = 'motionId' | 'email' | 'name';

export type InspectorMatch = {
  recordId: string;
  name: string;
  email?: string;
  phone?: string;
  motionId?: string;
  onCampaign?: boolean;
  campaignName?: string;
};

export type InspectorSearchResult = {
  matches: InspectorMatch[];
  matchCount: number;
  hasErrors: boolean;
  errorMessage?: string;
};

export type InspectorRegister = {
  airtableRecordId: string;
  motionId: string;
};

export type InspectorRegisterDetails = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  inspector: boolean;
  inspectorDetails: InspectorRegister[];
};
