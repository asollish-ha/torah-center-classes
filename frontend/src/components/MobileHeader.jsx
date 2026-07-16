export default function MobileHeader() {
  return (
    <header className="flex md:hidden items-center gap-2.5 mb-5">
      <img src="/icon.png" alt="" className="w-[34px] h-[34px] rounded-[10px] bg-teal p-1" />
      <div className="font-heading font-bold text-[16px] text-navy">The Torah Center of Atlanta</div>
    </header>
  );
}
