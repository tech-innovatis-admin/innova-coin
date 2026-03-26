const MiniFooter = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 w-full bg-[#121826]">
      <div className="mx-auto max-w-screen-xl px-4 py-5 text-xs text-gray-400">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="md:w-1/3 flex justify-center md:justify-start">
            <div className="space-x-2">
              <span>Termo de uso</span>
              <span>|</span>
              <span>Privacidade e Politica</span>
            </div>
          </div>

          <div className="md:w-1/3 flex justify-center">
            <p className="text-center">
              © {currentYear} Innovatis. Todos os direitos reservados.
            </p>
          </div>

          <div className="md:w-1/3 flex justify-center md:justify-end">
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
