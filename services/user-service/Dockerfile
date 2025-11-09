FROM php:8.2-cli
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    && docker-php-ext-install pdo_mysql
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
 WORKDIR /app
 COPY .env .env
 COPY . .

 RUN composer install --no-scripts --optimize-autoloader
 RUN chown -R www-data:www-data storage bootstrap/cache
 RUN touch database/database.sqlite
 EXPOSE 8000
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]