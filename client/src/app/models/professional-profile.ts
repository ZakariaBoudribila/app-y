export interface ProfessionalProfile {
  aboutMe: string;
  experiences: Array<Record<string, any>>;
  education: Array<Record<string, any>>;
  languages: string[];
  software: string[];
  phone?: string;
  address?: string;
  linkedin?: string;
}
