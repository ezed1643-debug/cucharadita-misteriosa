import { NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from 'mercadopago';

export async function POST(request) {
  try {
    const body = await request.json();
    const { carrito, costoEnvio } = body;

    const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    const preference = new Preference(client);

    const itemsMP = carrito.map(item => ({
      id: item.id,
      title: item.nombre,
      quantity: item.cantidad,
      unit_price: Number(item.precio),
      currency_id: 'ARS'
    }));

    const response = await preference.create({
      body: {
        items: itemsMP,
        shipments: {
          cost: Number(costoEnvio),
          mode: 'not_specified'
        },
        back_urls: {
          success: "http://localhost:3000/success", // <-- Agregamos /success aquí
          failure: "http://localhost:3000",
          pending: "http://localhost:3000"
        }
        // Eliminamos la línea de auto_return que bloqueaba el entorno local
      }
    });

    return NextResponse.json({ url: response.init_point });
    
  } catch (error) {
    console.error("Error al crear la preferencia:", error);
    return NextResponse.json({ error: "Error al procesar el pago" }, { status: 500 });
  }
}