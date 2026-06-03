type Props = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: Props) {
  return (
    <header className="mb-1 flex flex-col gap-1 pb-2">
      <h1 className="text-[20px] font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-[13px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}
