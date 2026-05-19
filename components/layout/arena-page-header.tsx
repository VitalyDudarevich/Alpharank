import {
  AppPageHeader,
  type AppPageHeaderProps,
} from "@/components/layout/app-page-header";

export type ArenaPageHeaderProps = Omit<AppPageHeaderProps, "title"> & {
  title?: string;
};

export function ArenaPageHeader({ title = "Арена", ...props }: ArenaPageHeaderProps) {
  return <AppPageHeader title={title} {...props} />;
}
