const { settings } = require('../../../../palmares/conf')

const AWS = require('aws-sdk')

/**
 * This class is used to interact with AWS S3. When on local development we will use the localstack 
 * instead of the real S3.
 */
class Bucket {
    constructor(bucket=null) {
        this.bucket = bucket === null ? settings.S3_BUCKET : bucket
    }

    /**
     * This will retrieve the client connection to the S3. If we are in the local development environment
     * we are going to connect to the localstack endpoint, this way we do not need to use the default staging
     * configuration.
     * 
     * On development environment we create the `reflow-crm` bucket every time we retrive the client.
     */
    async _getClient() {
        if (settings.ENV === 'development') {
            const client = new AWS.S3({
                endpoint: `http://${settings.LOCALSTACK_ENDPOINT}:${settings.LOCALSTACK_PORT}`,
                sslEnabled: true,
                accessKeyId: 'foo',
                secretAccessKey: 'bar',
                region: settings.S3_REGION_NAME,
                s3ForcePathStyle: true
            })
            
            return new Promise((resolve, reject) => {
                client.createBucket({ Bucket: settings.S3_BUCKET}, function (err, data) {
                    if (err && err.code !== 'BucketAlreadyExists') {
                        reject(err)
                    } else {
                        const doesBucketAlreadyExists = err && err.code === 'BucketAlreadyExists' ? true : false
                        if (!doesBucketAlreadyExists) console.log('Created Bucket in development server: ' + settings.S3_BUCKET)
                        resolve(client)
                    }
                })
            })
        } else {
            return new AWS.S3({
                accessKeyId: settings.AWS_ACCESS_KEY_ID,
                secretAccessKey: settings.AWS_SECRET_ACCESS_KEY,
                region: settings.S3_REGION_NAME,
                signatureVersion: 'v4'
            })
        }
    }

    /**
     * Uploads a file to a s3 bucket key and return the url of the file.
     * 
     * @param {Buffer} file - The actual file to upload.
     * @param {string} key - The key in which you want to upload the file.
     * @param {boolean} isPublic - Is the file public (Anyone can access) or not? Do not be confused with our
     * own isPublic flag implementation. The idea of the `isPublic` flag in our platform is understand if the
     * request comes from an unlogged user or not. Here the isPublic refers to s3 implementation for the
     * public file.
     * 
     * @returns {Promise<string>} The url of the file.
     */
    async upload(file, key, isPublic=false) {
        let extraArgs = {}
        if (isPublic === true) {
            extraArgs = {
                ACL: 'public-read'
            }
        }
        const data = await (await this._getClient()).upload({
            Bucket: settings.S3_BUCKET,
            Key: key,
            Body: file,
            ...extraArgs
        }).promise()
        return data.Location
    }

    /**
     * Copies a file from one key to another inside of the same bucket. The idea is just to copy files inside the s3.
     * This will be done extremely fast inside the s3 so it's usually not a problem.
     * 
     * @param {string} sourceKey - The key of the file you wish to copy.
     * @param {string} destinationKey - The key of the file you wish to copy to.
     * 
     * @returns {Promise<string>} - The url of the file.
     */
    async copy(sourceKey, destinationKey) {
        await (await this._getClient()).copyObject({
            Bucket: settings.S3_BUCKET,
            CopySource: `${settings.S3_BUCKET}/${sourceKey}`,
            Key: destinationKey
        }).promise()
        const url = new URL(await this.getUrlFromKey(destinationKey))
        return `${url.origin}/${url.pathname}`
    }

    /**
     * Retrieves a temporary url for the given object key inside of s3. This will guarantee that we have
     * a valid and private key that will expire after some time. By default we set the expiration time to 1 hour,
     * but you can change it as you wish.
     * 
     * @param {string} key - The key of the file you wish to get the url from.
     * @param {number} [expires=3600] - The expiration time in seconds. By default it's set to 1 hour.
     * 
     * @returns {Promise<string>} - The url of the file.
     */
    async getUrlFromKey(key, expires=3600) {
        const data = await (await this._getClient()).getSignedUrl('getObject', {
            Bucket: settings.S3_BUCKET,
            Key: key,
            Expires: expires
        })
        return data
    }
}

module.exports = Bucket