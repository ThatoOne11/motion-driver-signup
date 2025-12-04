export type SupportType = {
  preMessage: string;
  userMessage: string;
  name: string;
  motionId: string;
  userEmail?: string;
  sourceTag?: string;
};

export type SupportReturn = {
  HasErrors: boolean;
  Error?: string;
  UserError?: string;
  Data?: any;
};
