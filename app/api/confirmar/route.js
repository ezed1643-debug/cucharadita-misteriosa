import { NextResponse } from "next/server";
import { doc, updateDoc } from "firebase/firestore";
// Como lib está afuera de app, necesitamos salir 3 niveles hacia atrás
import { db } from "../../../lib/firebase"; 

export async function GET(request) {
  // 1. Extraemos el ID del pedido que Mercado Pago nos devuelve en la URL
  const { searchParams } = new URL(request.url);
  const pedidoId = searchParams.get("pedidoId");

  if (pedidoId) {
    try {
      // 2. Buscamos el pedido en Firebase y lo marcamos oficialmente como "Pagado"
      const pedidoRef = doc(db, "pedidos", pedidoId);
      await updateDoc(pedidoRef, { estado: "Pagado" });
    } catch (error) {
      console.error("Error al actualizar estado automático:", error);
    }
  }

  // 3. Finalmente, redirigimos al cliente de vuelta a la página principal de tu tienda
  return NextResponse.redirect(new URL("/", request.url));
}