import { FloatType, RedFormat } from '../../constants.js';
import { DataArrayTexture } from '../../textures/DataArrayTexture.js';
import { Vector4 } from '../../math/Vector4.js';
import { Vector2 } from '../../math/Vector2.js';

function WebGLMorphtargets( gl, capabilities, textures ) {

	const morphTextures = new WeakMap();
	const morph = new Vector4();

	function update( object, geometry, program ) {

		const objectInfluences = object.morphTargetInfluences;

		// the following encodes morph targets into an array of data textures. Each layer represents a single morph target.

		const morphAttribute = geometry.morphAttributes.position || geometry.morphAttributes.normal || geometry.morphAttributes.color;
		const morphTargetsCount = ( morphAttribute !== undefined ) ? morphAttribute.length : 0;

		let entry = morphTextures.get( geometry );

		if ( entry === undefined || entry.count !== morphTargetsCount ) {

			if ( entry !== undefined ) entry.texture.dispose();

			const hasMorphPosition = geometry.morphAttributes.position !== undefined;
			const hasMorphNormals = geometry.morphAttributes.normal !== undefined;
			const hasMorphColors = geometry.morphAttributes.color !== undefined;

			const morphTargets = geometry.morphAttributes.position || [];
			const morphNormals = geometry.morphAttributes.normal || [];
			const morphColors = geometry.morphAttributes.color || [];

			let vertexDataCount = 0;

			if ( hasMorphPosition === true ) vertexDataCount = 3;
			if ( hasMorphNormals === true ) vertexDataCount = 6;
			if ( hasMorphColors === true ) vertexDataCount = 10;

			let width = geometry.attributes.position.count * vertexDataCount;
			let height = 1;

			if ( width > capabilities.maxTextureSize ) {

				// Align width on stride to simplify the texel fetching in the shader
				const strideWidth = Math.floor( capabilities.maxTextureSize / vertexDataCount ) * vertexDataCount;
				height = Math.ceil( width / strideWidth );
				width = strideWidth;

			}

			const buffer = new Float32Array( width * height * morphTargetsCount );

			const texture = new DataArrayTexture( buffer, width, height, morphTargetsCount );
			texture.type = FloatType;
			texture.format = RedFormat;
			texture.needsUpdate = true;

			// fill buffer

			const vertexDataStride = vertexDataCount;

			for ( let i = 0; i < morphTargetsCount; i ++ ) {

				const morphTarget = morphTargets[ i ];
				const morphNormal = morphNormals[ i ];
				const morphColor = morphColors[ i ];

				const offset = width * height * i;

				for ( let j = 0; j < morphTarget.count; j ++ ) {

					const stride = j * vertexDataStride;

					if ( hasMorphPosition === true ) {

						morph.fromBufferAttribute( morphTarget, j );

						buffer[ offset + stride + 0 ] = morph.x;
						buffer[ offset + stride + 1 ] = morph.y;
						buffer[ offset + stride + 2 ] = morph.z;

					}

					if ( hasMorphNormals === true ) {

						morph.fromBufferAttribute( morphNormal, j );

						buffer[ offset + stride + 3 ] = morph.x;
						buffer[ offset + stride + 4 ] = morph.y;
						buffer[ offset + stride + 5 ] = morph.z;

					}

					if ( hasMorphColors === true ) {

						morph.fromBufferAttribute( morphColor, j );

						buffer[ offset + stride + 6 ] = morph.x;
						buffer[ offset + stride + 7 ] = morph.y;
						buffer[ offset + stride + 8 ] = morph.z;
						buffer[ offset + stride + 9 ] = ( morphColor.itemSize === 4 ) ? morph.w : 1;

					}

				}

			}

			entry = {
				count: morphTargetsCount,
				texture: texture,
				size: new Vector2( width, height )
			};

			morphTextures.set( geometry, entry );

			function disposeTexture() {

				texture.dispose();

				morphTextures.delete( geometry );

				geometry.removeEventListener( 'dispose', disposeTexture );

			}

			geometry.addEventListener( 'dispose', disposeTexture );

		}

		//
		if ( object.isInstancedMesh === true && object.morphTexture !== null ) {

			program.getUniforms().setValue( gl, 'morphTexture', object.morphTexture, textures );

		} else {

			let morphInfluencesSum = 0;

			for ( let i = 0; i < objectInfluences.length; i ++ ) {

				morphInfluencesSum += objectInfluences[ i ];

			}

			const morphBaseInfluence = geometry.morphTargetsRelative ? 1 : 1 - morphInfluencesSum;


			program.getUniforms().setValue( gl, 'morphTargetBaseInfluence', morphBaseInfluence );
			program.getUniforms().setValue( gl, 'morphTargetInfluences', objectInfluences );

		}

		program.getUniforms().setValue( gl, 'morphTargetsTexture', entry.texture, textures );
		program.getUniforms().setValue( gl, 'morphTargetsTextureSize', entry.size );

	}

	return {

		update: update

	};

}


export { WebGLMorphtargets };
