#version 330 core

//Setup the object's material.
uniform struct Material 
{
	vec3 ambient;
	vec3 diffuse;
	vec3 specular;
	float shininess;
} material;

//Setup the different light sources.
uniform struct DirLight 
{
	bool on;
    vec3 direction;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
} dirLight;

uniform struct PointLight
{
	bool on;
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
    float quadratic;
} pointLight;

uniform struct SpotLight
{
	bool on;
    vec3 position;
    vec3 ambient;
    vec3 diffuse;
    vec3 specular;
	float quadratic;

	vec3 direction;
	float spotCutoff;
	float spotExponent;
} spotLight;

uniform vec3 lightColor;
uniform vec3 viewPos;
uniform samplerCube skybox; // If we need to use it as a texture
uniform float reflect_intensity;


//Define any in variables from the vertex shader.
in vec3 FragPos;
in vec3 FragNormal;
in vec2 FragTexCoords;

//Define out variable for the fragment shader: color.
out vec4 color;

//Function prototypes.
vec3 CalcDirLight(DirLight dirLight, vec3 norm, vec3 viewDir);
vec3 CalcPointLight(PointLight pointLight, vec3 norm, vec3 fragPos, vec3 viewDir);
vec3 CalcSpotLight(SpotLight spotLight, vec3 norm, vec3 fragPos, vec3 viewDir);

void main()
{
    //----- Default to reduce warnings. -----//
    vec2 default_texCoords = FragTexCoords;
    bool useEnvironmentMap = false; // Set this to true if we plan on using environment mapping.

    //----- Default to reduce warnings. -----//
    
	vec3 result = vec3(0.0f, 0.0f, 0.0f); // Set to black in case all lights are off.

	// Light computation for the fragment shader. [DISABLED]
	vec3 norm = normalize(FragNormal);
	vec3 viewDir = normalize(viewPos - FragPos);
	
    // Calculate directional light if it is on.
	if(dirLight.on)
	{
		result += CalcDirLight(dirLight, norm, viewDir);
	}

	// Calculate point light if it is on.
	else if(pointLight.on)
	{
		result += CalcPointLight(pointLight, norm, FragPos, viewDir);
	}

	// Calculate spot light if it is on.
	else if(spotLight.on)
	{
		result += CalcSpotLight(spotLight, norm, FragPos, viewDir);
	}
    
    // Diffuse color after lighting is calculated.
    vec4 diffuse_color = vec4(result.x, result.y, result.z, 1.0f);
    color = diffuse_color;

	// Dynamic Environment mapping.
    if (useEnvironmentMap)
    {
        vec3 I = normalize(FragPos - viewPos);
        vec3 R = reflect(I, normalize(FragNormal));
        vec4 reflect_color = texture(skybox, R) * reflect_intensity;
        color = diffuse_color + reflect_color;
    }
} 

// Calculates the color when using a directional light.
vec3 CalcDirLight(DirLight dirLight, vec3 norm, vec3 viewDir)
{
	// Calculate Ambient: Ka * La
	vec3 l_ambient = material.ambient * dirLight.ambient;

	// Calculate Diffuse: Kd * Ld * max (0, n dot l)
    vec3 lightDir = normalize(-dirLight.direction);//No calculation, just the light direction.
    float maxDiffuse = max(0.0, dot(norm, lightDir));
	vec3 l_diffuse = material.diffuse * dirLight.diffuse * maxDiffuse;

	// Calculate Specular: Ks * Ls * max (0, r dot v) ^ alpha
	vec3 reflectDir = reflect(-lightDir, norm);
	float maxSpecular = max(0.0, dot(reflectDir, viewDir));
    vec3 l_specular = material.specular * dirLight.specular * pow(maxSpecular, material.shininess);

	return (l_ambient + l_diffuse + l_specular);
}

// Calculates the color when using a point light.
vec3 CalcPointLight(PointLight pointLight, vec3 norm, vec3 fragPos, vec3 viewDir)
{
	// Calculate Ambient: Ka * La
	vec3 l_ambient = material.ambient * pointLight.ambient;

	// Calculate Diffuse: Kd * Ld * max (0, n dot l)
	vec3 lightDir = normalize(pointLight.position - fragPos);
	float maxDiffuse = max(0.0, dot(norm, lightDir));
	vec3 l_diffuse = material.diffuse * pointLight.diffuse * maxDiffuse;

	// Calculate Specular: Ks * Ls * max (0, r dot v) ^ alpha
	vec3 reflectDir = reflect(-lightDir, norm);
	float maxSpecular = max(0.0, dot(reflectDir, viewDir));
    vec3 l_specular = material.specular * pointLight.specular * pow(maxSpecular, material.shininess);

	// Attenuation: (1/(c * (d^2))), multiply it with diffuse and specular components. 
    float distance = length(pointLight.position - fragPos);
    float attenuation = 1.0f / (pointLight.quadratic * (distance * distance));

	l_diffuse *= attenuation;
	l_specular *= attenuation;

	return (l_ambient + l_diffuse + l_specular);
}

// Calculates the color when using a spot light.
vec3 CalcSpotLight(SpotLight spotLight, vec3 norm, vec3 fragPos, vec3 viewDir)
{
	// Calculate Ambient: Ka * La
	vec3 l_ambient = material.ambient * spotLight.ambient;

	// Calculate Diffuse: Kd * Ld * max (0, n dot l)
	vec3 lightDir = normalize(spotLight.position - fragPos);
	float maxDiffuse = max(0.0, dot(norm, lightDir));
	vec3 l_diffuse = material.diffuse * spotLight.diffuse * maxDiffuse;

	// Calculate Specular: Ks * Ls * max (0, r dot v) ^ alpha
	vec3 reflectDir = reflect(-lightDir, norm);
	float maxSpecular = max(0.0, dot(reflectDir, viewDir));
    vec3 l_specular = material.specular * spotLight.specular * pow(maxSpecular, material.shininess);

	// Attenuation: (1/(c * (d^2))), multiply it with diffuse and specular components. 
    float distance = length(spotLight.position - fragPos);
    float attenuation = 1.0f / (spotLight.quadratic * (distance * distance));

	l_diffuse *= attenuation;
	l_specular *= attenuation;

	// Spotlight Intensity: (spot_dir * -l) ^ spot_exp). Use Direction, Spot Cutoff, Spot Exponent. Use theta equation.
    float cutoff = dot(-lightDir, normalize(spotLight.direction)); 
	float theta = acos(cutoff);
	float intensity = pow(cutoff, spotLight.spotExponent);

	l_diffuse *= intensity;
	l_specular *= intensity;

	if(theta > spotLight.spotCutoff)
	{
		return l_ambient;
	}

   	return (l_ambient + l_diffuse + l_specular);
}
