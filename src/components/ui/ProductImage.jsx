import React from 'react';

const ProductImage = ({ product, className = "" }) => {
  const [error, setError] = React.useState(false);

  const getFallbackIcon = () => {
    if (product.type === 'home') return 'package_2';
    return 'restaurant';
  };

  if (!product.image || error) {
    return (
      <div className={`flex items-center justify-center bg-slate-50 text-slate-200 ${className}`}>
        <span className="material-symbols-outlined !text-3xl">{getFallbackIcon()}</span>
      </div>
    );
  }

  const zoom = product.thumbZoom ?? 1;
  const ox = product.thumbOffsetX ?? 0;
  const oy = product.thumbOffsetY ?? 0;
  const hasThumbSettings = zoom !== 1 || ox !== 0 || oy !== 0;

  return (
    <div className={`overflow-hidden relative ${className}`}>
      <img
        src={product.image}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover"
        style={hasThumbSettings ? {
          transform: `scale(${zoom}) translate(${ox / zoom}px, ${oy / zoom}px)`,
          transformOrigin: 'center center',
        } : undefined}
        onError={(e) => { e.target.onerror = null; setError(true); }}
        loading="lazy"
      />
    </div>
  );
};

export default ProductImage;
