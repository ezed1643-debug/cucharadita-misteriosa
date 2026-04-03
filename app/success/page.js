"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Card, CardBody, Button } from "@nextui-org/react";

// Componente interno para manejar los parámetros de la URL
function SuccessContent() {
  const searchParams = useSearchParams();
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const guardarPedido = async () => {
      // 1. Recuperamos el carrito de la memoria
      const carritoGuardado = localStorage.getItem("carritoPendiente");
      const envioGuardado = localStorage.getItem("envioPendiente");
      
      // Obtenemos el ID de pago que nos manda Mercado Pago por la URL
      const paymentId = searchParams.get("payment_id");
      const status = searchParams.get("status");

      if (carritoGuardado && paymentId && !guardado) {
        const items = JSON.parse(carritoGuardado);
        const costoEnvio = Number(envioGuardado);
        const subtotal = items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

        try {
          // 2. Guardamos en la colección "pedidos" de Firebase
          await addDoc(collection(db, "pedidos"), {
            items: items,
            envio: costoEnvio,
            total: subtotal + costoEnvio,
            id_pago_mp: paymentId,
            estado_pago: status,
            fecha: serverTimestamp()
          });

          // 3. Limpiamos la memoria para que el carrito quede vacío
          localStorage.removeItem("carritoPendiente");
          localStorage.removeItem("envioPendiente");
          setGuardado(true);
          
        } catch (error) {
          console.error("Error al guardar el pedido en Firebase:", error);
        }
      }
    };

    guardarPedido();
  }, [searchParams, guardado]);

  return (
    <div className="max-w-2xl mx-auto mt-20 p-6 text-center">
      <Card shadow="sm" className="p-8">
        <CardBody className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl font-bold mb-4">
            ✓
          </div>
          <h1 className="text-3xl font-bold">¡Pago Exitoso!</h1>
          <p className="text-gray-600">
            Tu pago se procesó correctamente y hemos registrado tu pedido.
          </p>
          <p className="text-sm text-gray-400 mb-6">
            N° de Transacción: {searchParams.get("payment_id")}
          </p>
          <Button color="primary" variant="flat" onPress={() => window.location.href = "/"}>
            Volver a la tienda
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

// Envolvemos todo en Suspense (requerido por Next.js para leer URLs)
export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Procesando tu pago...</div>}>
      <SuccessContent />
    </Suspense>
  );
}