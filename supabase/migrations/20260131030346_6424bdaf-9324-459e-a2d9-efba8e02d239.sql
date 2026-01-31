-- Amazon Produktbilder für alle 3 Produkte setzen

UPDATE public.supplement_products SET
  amazon_image = 'https://m.media-amazon.com/images/I/71nrCK5rPvL._AC_SL500_.jpg'
WHERE amazon_asin = 'B0DNN2PHTZ';

UPDATE public.supplement_products SET
  amazon_image = 'https://m.media-amazon.com/images/I/61RruzBt0gL._AC_SL500_.jpg'
WHERE amazon_asin = 'B0725X1B5D';

UPDATE public.supplement_products SET
  amazon_image = 'https://m.media-amazon.com/images/I/618R0rGZb4L._AC_SL500_.jpg'
WHERE amazon_asin = 'B06XXGNMHB';