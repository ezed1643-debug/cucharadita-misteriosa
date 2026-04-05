import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configuración inicial de Mercado Pago
// Reemplaza "TU_ACCESS_TOKEN_AQUI" por el tuyo, o asegúrate de tenerlo en las variables de entorno de Vercel
    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

export async function POST(req) {
  try {
    // Atrapamos la dirección de tu página web automáticamente (localhost en tu PC o tu link en Vercel)
    const origin = req.headers.get("origin") || `https://${req.headers.get("host")}`;
    
    // Recibimos los datos que nos mandó la página principal
    const data = await req.json();
    const { carrito, costoEnvio, cliente, pedidoId } = data;

    // 1. Transformamos los productos de tu carrito al formato exacto que exige Mercado Pago
    const itemsMercadoPago = carrito.map((producto) => ({
      title: producto.nombre,
      unit_price: Number(producto.precio),
      quantity: Number(producto.cantidad),
      currency_id: "ARS",
    }));

    // 2. Si el cliente eligió envío a domicilio, lo sumamos a la boleta como un ítem extra
    if (costoEnvio > 0) {
      itemsMercadoPago.push({
        title: "Costo de Envío",
        unit_price: Number(costoEnvio),
        quantity: 1,
        currency_id: "ARS",
      });
    }

    // 3. Creamos la "Preferencia de Pago" (la orden de cobro)
    const preference = new Preference(client);
    
    const result = await preference.create({
      body: {
        items: itemsMercadoPago,
        payer: {
          name: cliente?.nombre || "Cliente Cucharadita",
        },
        // EL PUENTE INVISIBLE: Qué hace Mercado Pago cuando el cliente termina
        back_urls: {
          success: `${origin}/api/confirmar?pedidoId=${pedidoId}`, // Si paga bien, confirmamos la orden
          failure: `${origin}/`, // Si falla o cancela, lo devolvemos a tu tienda
          pending: `${origin}/`
        },
        auto_return: "approved", // Redirige al cliente automáticamente sin que tenga que tocar un botón
      }
    });

    // 4. Le devolvemos a la web el link de pago oficial de Mercado Pago
    return NextResponse.json({ url: result.init_point });
    
  } catch (error) {
    console.error("Error al crear preferencia de Mercado Pago:", error);
    return NextResponse.json({ error: "Hubo un problema al procesar el pago." }, { status: 500 });
  }
}