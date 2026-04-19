import { motion } from "framer-motion";

export default function LuminaOrb({ size = "md", thinking = false }) {
  const sizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  return (
    <div className={`relative ${sizes[size]} flex items-center justify-center flex-shrink-0`}>
      {/* Outer glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(ellipse, hsla(196,80%,65%,0.25) 0%, transparent 70%)",
        }}
        animate={{ scale: thinking ? [1, 1.3, 1] : [1, 1.1, 1], opacity: thinking ? [0.6, 1, 0.6] : [0.4, 0.7, 0.4] }}
        transition={{ duration: thinking ? 1.2 : 3, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Inner orb */}
      <motion.div
        className="relative rounded-full border"
        style={{
          width: size === "sm" ? 28 : size === "lg" ? 56 : 40,
          height: size === "sm" ? 28 : size === "lg" ? 56 : 40,
          background: "linear-gradient(135deg, hsla(196,80%,65%,0.9) 0%, hsla(270,60%,65%,0.7) 100%)",
          borderColor: "hsla(196,80%,65%,0.4)",
          boxShadow: "0 0 20px hsla(196,80%,65%,0.4), inset 0 1px 0 hsla(255,255,255,0.2)",
        }}
        animate={{ rotate: thinking ? 360 : 0 }}
        transition={{ duration: 3, repeat: thinking ? Infinity : 0, ease: "linear" }}
      >
        {/* Core light */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(ellipse at 35% 35%, hsla(255,255,255,0.4) 0%, transparent 60%)",
          }}
        />
        {/* L letter */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-playfair font-semibold text-white/90 select-none"
            style={{ fontSize: size === "sm" ? 11 : size === "lg" ? 22 : 16 }}
          >
            L
          </span>
        </div>
      </motion.div>
    </div>
  );
}