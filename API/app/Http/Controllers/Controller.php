<?php

namespace App\Http\Controllers;

/**
 * @OA\Info(
 *     version="1.0.0",
 *     title="SNC Calculator API",
 *     description="API for Termite Risk Calculator and Pest Inspection Management",
 *     @OA\Contact(
 *         email="support@snc.com",
 *         name="SNC Support"
 *     )
 * )
 *
 * @OA\Server(
 *     url=L5_SWAGGER_CONST_HOST,
 *     description="API Server"
 * )
 *
 * @OA\SecurityScheme(
 *     securityScheme="sanctum",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="Enter token in format: Bearer {api_token}"
 * )
 *
 * @OA\Tag(name="Authentication", description="User authentication endpoints")
 * @OA\Tag(name="Clients", description="Client management endpoints")
 * @OA\Tag(name="Inspections", description="Pest inspection endpoints")
 * @OA\Tag(name="Documents", description="Document generation endpoints")
 * @OA\Tag(name="Images", description="Image upload and pest detection endpoints")
 */
abstract class Controller
{
    //
}
