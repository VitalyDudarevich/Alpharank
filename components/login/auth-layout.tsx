import Image from "next/image";

export function AuthLayout({
  children,
  compact,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <main className="relative flex min-h-screen min-h-[100dvh] flex-col items-center justify-end overflow-hidden px-4 pb-8 pt-6 sm:justify-center sm:px-8 sm:pb-12">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #0a0814 0%, #07060d 35%, #06050b 70%, #050408 100%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[8%] h-[55vh] w-[min(100%,520px)] -translate-x-1/2 rounded-full opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(88, 28, 135, 0.35) 0%, rgba(30, 58, 138, 0.15) 40%, transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[12%] h-[40vh] w-[80%] max-w-md -translate-x-1/2 rounded-full bg-violet-900/20 blur-[80px]"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-[380px] flex-col items-center">
        {!compact && (
          <div className="relative -mb-10 w-full -translate-y-[20px] sm:-mb-14">
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 translate-y-[25px] bg-gradient-to-t from-[#06050b] via-[#06050b]/90 to-transparent sm:h-32"
              aria-hidden
            />
            <Image
              src="/logo-hero.png"
              alt="alphaRank"
              width={640}
              height={360}
              priority
              className="relative z-0 h-auto w-full [mask-image:linear-gradient(to_bottom,black_calc(55%+25px),transparent_100%)]"
            />
          </div>
        )}
        {children}
      </div>
    </main>
  );
}
