-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 31-10-2025 a las 21:57:37
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `pdfblob`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cardex`
--

CREATE TABLE `cardex` (
  `id` bigint(11) NOT NULL,
  `numero` bigint(11) DEFAULT NULL,
  `provisorio` bigint(11) NOT NULL DEFAULT 0,
  `nombre` varchar(40) NOT NULL DEFAULT '',
  `rut` varchar(13) NOT NULL DEFAULT '',
  `domicilio` varchar(200) DEFAULT NULL,
  `email` varchar(300) DEFAULT NULL,
  `boleta` varchar(20) NOT NULL DEFAULT '0',
  `boleta_old` varchar(60) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `nombre_boleta` varchar(40) NOT NULL DEFAULT '',
  `rut_boleta` varchar(13) NOT NULL DEFAULT '',
  `domicilio_boleta` varchar(200) DEFAULT NULL,
  `ciudad_boleta` varchar(20) DEFAULT NULL,
  `estado` varchar(60) DEFAULT NULL,
  `total` int(11) DEFAULT 0,
  `abono` int(11) DEFAULT 0,
  `devolucion` int(11) NOT NULL DEFAULT 0,
  `retencion` int(11) NOT NULL DEFAULT 0,
  `porcentaje` float DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `observaciones_anexas` text NOT NULL,
  `presuntiva` text DEFAULT NULL,
  `fecha_i` date NOT NULL DEFAULT '0000-00-00',
  `fecha_f` date DEFAULT NULL,
  `fecha_c` date NOT NULL,
  `fecha_boleta` date DEFAULT NULL,
  `fecha_reingreso` date DEFAULT NULL,
  `fecha_matricero` date NOT NULL,
  `fecha_aprobado` date NOT NULL,
  `hora` time DEFAULT NULL,
  `hora_pago` time DEFAULT NULL,
  `responsable` varchar(20) NOT NULL DEFAULT '',
  `cajera` varchar(50) DEFAULT NULL,
  `codigo` varchar(30) DEFAULT NULL,
  `permiso` date NOT NULL DEFAULT '0000-00-00',
  `id_web` int(20) DEFAULT NULL,
  `origen` char(1) NOT NULL DEFAULT '',
  `ultima_mod` date DEFAULT NULL,
  `ultimo_usuario` varchar(30) DEFAULT NULL,
  `inscriptor` varchar(30) DEFAULT NULL,
  `matricero` varchar(30) NOT NULL,
  `revisor2` varchar(20) NOT NULL,
  `gp` varchar(30) NOT NULL,
  `copiador` varchar(20) NOT NULL,
  `sin_pago` varchar(5) DEFAULT NULL,
  `cliente` varchar(100) DEFAULT NULL,
  `con_repertorio` varchar(1) NOT NULL DEFAULT '0',
  `area` varchar(60) DEFAULT NULL,
  `numero_envio` varchar(60) DEFAULT NULL,
  `tiempo` int(6) DEFAULT NULL,
  `numero_orden` int(16) DEFAULT NULL,
  `fecha_envio` date DEFAULT NULL,
  `destinatario` varchar(80) NOT NULL,
  `mail_destinatario` varchar(80) NOT NULL,
  `tiene_firma` varchar(3) NOT NULL DEFAULT 'nop',
  `retrasar_envio` varchar(2) NOT NULL DEFAULT 'no',
  `formato_revision` varchar(60) NOT NULL,
  `tipo_entrega` varchar(15) NOT NULL,
  `casillero` int(20) DEFAULT NULL,
  `id_solicitud_inscripcion_web` varchar(25) NOT NULL,
  `se_imprimio` varchar(1) NOT NULL DEFAULT 'n',
  `es_copia_plano` varchar(1) NOT NULL DEFAULT 'n',
  `se_envio_email_cotizacion` varchar(1) NOT NULL DEFAULT 'n',
  `se_envio_email_cotizacion_fecha` datetime NOT NULL,
  `se_envio_email_cotizacion_usuario` varchar(20) NOT NULL,
  `sexo` varchar(30) NOT NULL,
  `nacionalidad` varchar(100) NOT NULL,
  `profecion` varchar(250) NOT NULL,
  `se_subio_imagen_final` varchar(3) NOT NULL DEFAULT 'nop',
  `pago_webpay` varchar(3) NOT NULL,
  `glosa_boleta` text NOT NULL,
  `ot_envio` varchar(20) NOT NULL,
  `postergacion_enviar_email` varchar(3) NOT NULL,
  `es_alzamiento` varchar(30) NOT NULL DEFAULT '0',
  `presuntiva_pre` text DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `cardex_presuntiva`
--

CREATE TABLE `cardex_presuntiva` (
  `id` int(20) NOT NULL,
  `numero` int(20) NOT NULL,
  `presuntiva` text NOT NULL,
  `fecha` date NOT NULL,
  `revisor` varchar(40) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificados_listo`
--

CREATE TABLE `certificados_listo` (
  `id` bigint(11) NOT NULL,
  `numero_firma` varchar(30) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `caratula` int(10) NOT NULL,
  `libro` varchar(80) NOT NULL,
  `folio_real` int(20) NOT NULL,
  `foja` varchar(30) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `anho` int(4) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `data` longblob NOT NULL,
  `usuario` varchar(20) NOT NULL,
  `listo` varchar(3) NOT NULL DEFAULT 'nop',
  `texto` text DEFAULT NULL,
  `mail_destinatario` text NOT NULL,
  `pdf_tipo` varchar(20) NOT NULL,
  `revisor` varchar(20) DEFAULT NULL,
  `codigo_descarga` varchar(30) NOT NULL,
  `codigo` varchar(100) NOT NULL,
  `esta_en_fojas` varchar(3) NOT NULL DEFAULT 'nop',
  `certificados_listo_hash` varchar(3) NOT NULL DEFAULT 'nop',
  `ancho_pdf` int(11) NOT NULL,
  `fecha_firma` date NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificados_listo_2025_03`
--

CREATE TABLE `certificados_listo_2025_03` (
  `id` int(11) NOT NULL,
  `numero_firma` varchar(30) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `caratula` int(10) NOT NULL,
  `libro` varchar(80) NOT NULL,
  `folio_real` int(20) NOT NULL,
  `foja` varchar(30) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `anho` int(4) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `data` longblob NOT NULL,
  `usuario` varchar(20) NOT NULL,
  `listo` varchar(3) NOT NULL DEFAULT 'nop',
  `texto` text DEFAULT NULL,
  `mail_destinatario` text NOT NULL,
  `pdf_tipo` varchar(20) NOT NULL,
  `revisor` varchar(20) DEFAULT NULL,
  `codigo_descarga` varchar(30) NOT NULL,
  `codigo` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificados_listo_2025_04`
--

CREATE TABLE `certificados_listo_2025_04` (
  `id` int(11) NOT NULL,
  `numero_firma` varchar(30) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `caratula` int(10) NOT NULL,
  `libro` varchar(80) NOT NULL,
  `folio_real` int(20) NOT NULL,
  `foja` varchar(30) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `anho` int(4) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `data` longblob NOT NULL,
  `usuario` varchar(20) NOT NULL,
  `listo` varchar(3) NOT NULL DEFAULT 'nop',
  `texto` text DEFAULT NULL,
  `mail_destinatario` text NOT NULL,
  `pdf_tipo` varchar(20) NOT NULL,
  `revisor` varchar(20) DEFAULT NULL,
  `codigo_descarga` varchar(30) NOT NULL,
  `codigo` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificados_listo_2025_05`
--

CREATE TABLE `certificados_listo_2025_05` (
  `id` int(11) NOT NULL,
  `numero_firma` varchar(30) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `caratula` int(10) NOT NULL,
  `libro` varchar(80) NOT NULL,
  `folio_real` int(20) NOT NULL,
  `foja` varchar(30) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `anho` int(4) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `data` longblob NOT NULL,
  `usuario` varchar(20) NOT NULL,
  `listo` varchar(3) NOT NULL DEFAULT 'nop',
  `texto` text DEFAULT NULL,
  `mail_destinatario` text NOT NULL,
  `pdf_tipo` varchar(20) NOT NULL,
  `revisor` varchar(20) DEFAULT NULL,
  `codigo_descarga` varchar(30) NOT NULL,
  `codigo` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `certificados_listo_2025_06`
--

CREATE TABLE `certificados_listo_2025_06` (
  `id` int(11) NOT NULL,
  `numero_firma` varchar(30) NOT NULL,
  `tipo` varchar(80) NOT NULL,
  `caratula` int(10) NOT NULL,
  `libro` varchar(80) NOT NULL,
  `folio_real` int(20) NOT NULL,
  `foja` varchar(30) NOT NULL,
  `numero` varchar(20) NOT NULL,
  `anho` int(4) NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `data` longblob NOT NULL,
  `usuario` varchar(20) NOT NULL,
  `listo` varchar(3) NOT NULL DEFAULT 'nop',
  `texto` text DEFAULT NULL,
  `mail_destinatario` text NOT NULL,
  `pdf_tipo` varchar(20) NOT NULL,
  `revisor` varchar(20) DEFAULT NULL,
  `codigo_descarga` varchar(30) NOT NULL,
  `codigo` varchar(100) NOT NULL
) ENGINE=MyISAM DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `envios_whatsapp`
--

CREATE TABLE `envios_whatsapp` (
  `id` int(11) UNSIGNED NOT NULL,
  `numero_caratula` int(11) NOT NULL,
  `telefono` varchar(50) NOT NULL,
  `nombre_cliente` varchar(255) NOT NULL,
  `estado` varchar(50) NOT NULL,
  `fecha_envio` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `cardex`
--
ALTER TABLE `cardex`
  ADD PRIMARY KEY (`id`),
  ADD KEY `rut` (`rut`),
  ADD KEY `numero` (`numero`),
  ADD KEY `provisorio` (`provisorio`),
  ADD KEY `fecha_i` (`fecha_i`),
  ADD KEY `id_web` (`id_web`),
  ADD KEY `estado` (`estado`),
  ADD KEY `boleta` (`boleta`),
  ADD KEY `fecha_boleta` (`fecha_boleta`),
  ADD KEY `responsable` (`responsable`),
  ADD KEY `matricero` (`matricero`),
  ADD KEY `fecha_matricero` (`fecha_matricero`),
  ADD KEY `fecha_c` (`fecha_c`),
  ADD KEY `fecha_c_2` (`fecha_c`),
  ADD KEY `revisor2` (`revisor2`),
  ADD KEY `retrasar_envio` (`retrasar_envio`),
  ADD KEY `tipo_entrega` (`tipo_entrega`),
  ADD KEY `fecha_aprobado` (`fecha_aprobado`),
  ADD KEY `id_solicitud_inscripcion_web` (`id_solicitud_inscripcion_web`),
  ADD KEY `se_imprimio` (`se_imprimio`),
  ADD KEY `es_copia_plano` (`es_copia_plano`),
  ADD KEY `se_envio_email_cotizacion` (`se_envio_email_cotizacion`),
  ADD KEY `responsable_2` (`responsable`),
  ADD KEY `hora` (`hora`),
  ADD KEY `se_subio_imagen_final` (`se_subio_imagen_final`),
  ADD KEY `cliente` (`cliente`),
  ADD KEY `cliente_2` (`cliente`),
  ADD KEY `responsable_3` (`responsable`),
  ADD KEY `hora_2` (`hora`),
  ADD KEY `cliente_3` (`cliente`),
  ADD KEY `ultima_mod` (`ultima_mod`),
  ADD KEY `pago_webpay` (`pago_webpay`),
  ADD KEY `postergacion_enviar_email` (`postergacion_enviar_email`),
  ADD KEY `es_alzamiento` (`es_alzamiento`);
ALTER TABLE `cardex` ADD FULLTEXT KEY `nombre` (`nombre`);
ALTER TABLE `cardex` ADD FULLTEXT KEY `nombre_boleta` (`nombre_boleta`);
ALTER TABLE `cardex` ADD FULLTEXT KEY `observaciones` (`observaciones`);

--
-- Indices de la tabla `cardex_presuntiva`
--
ALTER TABLE `cardex_presuntiva`
  ADD PRIMARY KEY (`id`),
  ADD KEY `numero` (`numero`,`fecha`),
  ADD KEY `revisor` (`revisor`);

--
-- Indices de la tabla `certificados_listo`
--
ALTER TABLE `certificados_listo`
  ADD PRIMARY KEY (`id`),
  ADD KEY `caratula` (`caratula`),
  ADD KEY `libro` (`libro`),
  ADD KEY `folio_real` (`folio_real`),
  ADD KEY `foja` (`foja`),
  ADD KEY `numero` (`numero`),
  ADD KEY `anho` (`anho`),
  ADD KEY `fecha` (`fecha`),
  ADD KEY `listo` (`listo`),
  ADD KEY `numero_firma` (`numero_firma`),
  ADD KEY `tipo` (`tipo`),
  ADD KEY `esta_en_fojas` (`esta_en_fojas`),
  ADD KEY `pdf_tipo` (`pdf_tipo`),
  ADD KEY `ancho_pdf` (`ancho_pdf`),
  ADD KEY `certificados_listo_hash` (`certificados_listo_hash`);

--
-- Indices de la tabla `certificados_listo_2025_03`
--
ALTER TABLE `certificados_listo_2025_03`
  ADD PRIMARY KEY (`id`),
  ADD KEY `caratula` (`caratula`),
  ADD KEY `libro` (`libro`),
  ADD KEY `folio_real` (`folio_real`),
  ADD KEY `foja` (`foja`),
  ADD KEY `numero` (`numero`),
  ADD KEY `anho` (`anho`),
  ADD KEY `fecha` (`fecha`),
  ADD KEY `listo` (`listo`),
  ADD KEY `numero_firma` (`numero_firma`);

--
-- Indices de la tabla `certificados_listo_2025_04`
--
ALTER TABLE `certificados_listo_2025_04`
  ADD PRIMARY KEY (`id`),
  ADD KEY `caratula` (`caratula`),
  ADD KEY `libro` (`libro`),
  ADD KEY `folio_real` (`folio_real`),
  ADD KEY `foja` (`foja`),
  ADD KEY `numero` (`numero`),
  ADD KEY `anho` (`anho`),
  ADD KEY `fecha` (`fecha`),
  ADD KEY `listo` (`listo`),
  ADD KEY `numero_firma` (`numero_firma`);

--
-- Indices de la tabla `certificados_listo_2025_05`
--
ALTER TABLE `certificados_listo_2025_05`
  ADD PRIMARY KEY (`id`),
  ADD KEY `caratula` (`caratula`),
  ADD KEY `libro` (`libro`),
  ADD KEY `folio_real` (`folio_real`),
  ADD KEY `foja` (`foja`),
  ADD KEY `numero` (`numero`),
  ADD KEY `anho` (`anho`),
  ADD KEY `fecha` (`fecha`),
  ADD KEY `listo` (`listo`),
  ADD KEY `numero_firma` (`numero_firma`);

--
-- Indices de la tabla `certificados_listo_2025_06`
--
ALTER TABLE `certificados_listo_2025_06`
  ADD PRIMARY KEY (`id`),
  ADD KEY `caratula` (`caratula`),
  ADD KEY `libro` (`libro`),
  ADD KEY `folio_real` (`folio_real`),
  ADD KEY `foja` (`foja`),
  ADD KEY `numero` (`numero`),
  ADD KEY `anho` (`anho`),
  ADD KEY `fecha` (`fecha`),
  ADD KEY `listo` (`listo`),
  ADD KEY `numero_firma` (`numero_firma`);

--
-- Indices de la tabla `envios_whatsapp`
--
ALTER TABLE `envios_whatsapp`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `cardex`
--
ALTER TABLE `cardex`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `cardex_presuntiva`
--
ALTER TABLE `cardex_presuntiva`
  MODIFY `id` int(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `certificados_listo`
--
ALTER TABLE `certificados_listo`
  MODIFY `id` bigint(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `certificados_listo_2025_03`
--
ALTER TABLE `certificados_listo_2025_03`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `certificados_listo_2025_04`
--
ALTER TABLE `certificados_listo_2025_04`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `certificados_listo_2025_05`
--
ALTER TABLE `certificados_listo_2025_05`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `certificados_listo_2025_06`
--
ALTER TABLE `certificados_listo_2025_06`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `envios_whatsapp`
--
ALTER TABLE `envios_whatsapp`
  MODIFY `id` int(11) UNSIGNED NOT NULL AUTO_INCREMENT;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
