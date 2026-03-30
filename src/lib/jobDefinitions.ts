export type JobParameter = {
  name: string;
  label: string;
  defaultValue: string;
  required: boolean;
};

export type PredefinedJob = {
  key: string;
  databricksJobId: number;
  displayName: string;
  description: string;
  parameters: JobParameter[];
};

export const PREDEFINED_JOBS: PredefinedJob[] = [
  {
    key: "bank_statement_processing",
    databricksJobId: 0, // TODO: replace with actual Databricks Job ID
    displayName: "Bank Statement Processing",
    description:
      "Transforms bank statement images into structured data that can be linked to audit cases by bank name.",
    parameters: [
      { name: "bank_name", label: "Bank Name", defaultValue: "", required: true },
      {
        name: "volume_path",
        label: "Volume Path",
        defaultValue: "/Volumes/main/tsfrt/occ/bank_statements",
        required: true,
      },
      {
        name: "target_table",
        label: "Target Table",
        defaultValue: "main.tsfrt.bank_statement_analysis",
        required: true,
      },
    ],
  },
  {
    key: "meeting_minutes_processing",
    databricksJobId: 0, // TODO: replace with actual Databricks Job ID
    displayName: "Meeting Minutes Processing",
    description:
      "Transforms meeting audio files into structured meeting data for audit case review.",
    parameters: [
      { name: "bank_name", label: "Bank Name", defaultValue: "", required: true },
      {
        name: "volume_path",
        label: "Volume Path",
        defaultValue: "/Volumes/main/tsfrt/occ/meeting_minutes",
        required: true,
      },
      {
        name: "target_table",
        label: "Target Table",
        defaultValue: "main.tsfrt.meeting_analysis",
        required: true,
      },
    ],
  },
];

export function getJobByKey(key: string): PredefinedJob | undefined {
  return PREDEFINED_JOBS.find((j) => j.key === key);
}
