import { Providers } from "./providers";
import "./globals.css";

export const metadata = {
  title: "Mi Tienda",
  description: "Catálogo de productos",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}