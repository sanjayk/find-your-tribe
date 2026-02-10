export default function Footer() {
  return (
    <footer className="py-12 md:py-16">
      <div className="max-w-[1120px] mx-auto px-5 md:px-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="font-serif text-lg text-ink">find your tribe</span>
            <p className="text-[12px] text-ink-tertiary mt-1">
              Clout through building, not posting.
            </p>
          </div>
          <div className="flex items-center gap-6 text-[13px] text-ink-tertiary">
            <a href="#" className="hover:text-ink transition-colors">
              About
            </a>
            <a href="#" className="hover:text-ink transition-colors">
              GitHub
            </a>
            <a href="#" className="hover:text-ink transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
