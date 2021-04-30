<?php

namespace KokoAnalytics;

class Endpoint_Installer {
	public function run() {
		update_option( 'koko_analytics_use_custom_endpoint', $this->install_optimized_endpoint_file(), true );
	}

	private function install_optimized_endpoint_file() {
		/* Do nothing if running Multisite (because Multisite has separate uploads directory per site) */
		if ( is_multisite() ) {
			return false;
		}

		$custom_endpoint_path = apply_filters('koko_analytics_custom_endpoint_path', ABSPATH . '/koko-analytics-collect.php');
		/* Attempt to put the file into place if it does not exist already */
		if ( ! file_exists( $custom_endpoint_path ) ) {
			$success = file_put_contents( $custom_endpoint_path, $this->get_file_contents() );
			if ( ! $success ) {
				return false;
			}
		}

		/* Send an HTTP request to the custom endpoint to see if it's working properly */
		$works = $this->test();
		if ( ! $works ) {
			/* Remove the file */
			unlink( $custom_endpoint_path );
			return false;
		}

		/* All looks good! Custom endpoint file exists and returns the correct response */
		return true;
	}

	public function get_file_contents() {
		$buffer_filename = get_buffer_filename();
		$functions_filename = KOKO_ANALYTICS_PLUGIN_DIR . '/src/functions.php';
		return <<<EOT
<?php
/**
 * @package koko-analytics
 * @license GPL-3.0+
 * @author Danny van Kooten
 *
 * This file acts as an optimized endpoint file for the Koko Analytics plugin.
 */

// path to pageviews.php file in uploads directory
define('KOKO_ANALYTICS_BUFFER_FILE', '$buffer_filename');

// path to functions.php file in Koko Analytics plugin directory
require '$functions_filename';

// function call to collect the request data
KokoAnalytics\collect_request();
EOT;
	}

	/**
	 * Check for correct HTTP response from custom endpoint file.
	 *
	 * @see collect_request()
	 * @return bool
	 */
	private function test() {
		/**
		 * Filter the custom endpoint url
		 *
		 * @var string $custom_endpoint_url as expected by plugin
		 * @var bool $test whether this is testing the endpoint
		 *
		 * @return string
		 */
		$custom_endpoint_url = apply_filters( 'koko_analytics_custom_endpoint_url', site_url( '/koko-analytics-collect.php?nv=1&p=0&up=1&test=1' ), true );
		$response = wp_remote_get( $custom_endpoint_url );
		if ( is_wp_error( $response ) ) {
			return false;
		}

		$status = wp_remote_retrieve_response_code( $response );
		$headers = wp_remote_retrieve_headers( $response );
		$body = wp_remote_retrieve_body( $response );
		if ( $status !== 200 || $headers['Content-Type'] !== 'image/gif' || $body !== base64_decode( 'R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==' ) ) {
			return false;
		}

		return true;
	}
}
