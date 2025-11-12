FROM php:8.2-cli
RUN apt-get update && apt-get install -y \
    libzip-dev \
    unzip \
    libpq-dev \
    && docker-php-ext-install pdo_mysql \
    && docker-php-ext-install pdo_pgsql
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer
 WORKDIR /app
 COPY .env .env
COPY . .

RUN composer install --no-scripts --optimize-autoloader
RUN chown -R www-data:www-data storage bootstrap/cache
EXPOSE 8000
CMD ["sh", "-lc", "php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=8000"]