import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Reemplaza esto con tu Access Token de PRODUCCIÓN real (el que empieza con APP_USR-)
const client = new MercadoPagoConfig({ 
  accessToken: "APP_USR-8137466774618389-040215-b3160a74a6f7a8cf59fbd4732f337e81-3311076492" 
});

export async function POST(req) {
  try {
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    const data = await req.json();
    const { carrito, costoEnvio, pedidoId } = data; // Quitamos 'cliente' de aquí por seguridad

    // 1. Armamos la lista de productos estricta
    const itemsMercadoPago = carrito.map((producto) => ({
      title: producto.nombre,
      unit_price: Number(producto.precio), // Obligamos a que sea un número
      quantity: Number(producto.cantidad), // Obligamos a que sea un número entero
      currency_id: "ARS",
    }));

    // 2. Sumamos el envío si lo hay
    if (costoEnvio > 0) {
      itemsMercadoPago.push({
        title: "Costo de Envío",
        unit_price: Number(costoEnvio),
        quantity: 1,
        currency_id: "ARS",
      });
    }

    // 3. Creamos la orden de cobro súper limpia
    const preference = new Preference(client);
    
    const result = await preference.create({
      body: {
        items: itemsMercadoPago,
        // El puente invisible
        back_urls: {
          success: `${origin}/api/confirmar?pedidoId=${pedidoId}`, 
          failure: `${origin}/`, 
          pending: `${origin}/`
        },
        auto_return: "approved",
      }
    });

    return NextResponse.json({ url: result.init_point });
    
  } catch (error) {
    console.error("Error exacto de MP:", error);
    return NextResponse.json({ error: "Hubo un problema" }, { status: 500 });
  }
}