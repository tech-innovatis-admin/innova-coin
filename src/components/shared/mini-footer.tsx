const MiniFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 mt-auto w-full bg-[#121826]">
      <div className="mx-auto max-w-screen-xl px-4 py-2.5 text-[10px] text-gray-400 sm:py-4 sm:text-xs">
        <div className="flex flex-col gap-1.5 text-center sm:gap-3 md:flex-row md:items-center md:justify-between md:text-left">
          <div className="md:w-1/3 md:text-left">
            <div className="space-x-1.5 sm:space-x-2">
              <span>Termo de uso</span>
              <span>|</span>
              <span>Política de Privacidade</span>
            </div>
          </div>

          <div className="md:w-1/3 md:text-center">
            <p>© {currentYear} Innovatis. Todos os direitos reservados.</p>
          </div>

          <div className="md:w-1/3 md:text-right">
            <p className="text-gray-400 transition-colors hover:text-gray-300">
              Powered by Innovation Team - Innovatis MC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MiniFooter;
