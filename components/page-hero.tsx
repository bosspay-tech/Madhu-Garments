import Link from "next/link";

type PageHeroProps = {
  title: string;
  plain?: boolean;
};

export function PageHero({ title, plain = false }: PageHeroProps) {
  return (
    <section className={plain ? "page-hero page-hero-plain" : "page-hero"}>
      <h1>{title}</h1>
      {!plain && (
        <p>
          <Link href="/">Home</Link>
          <span>/</span>
          {title}
        </p>
      )}
    </section>
  );
}
