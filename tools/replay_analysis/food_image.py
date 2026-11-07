"""Normalize explicitly uploaded meal photos without forwarding EXIF or location."""
import io,base64,math
from coaching import CoachingError,respond
MAX_PHOTO_BYTES=5*1024*1024

def normalized_photo(raw):
    if not raw or len(raw)>MAX_PHOTO_BYTES:raise CoachingError('invalid_photo','Choose a JPEG or PNG photo smaller than 5 MB.')
    from PIL import Image,ImageOps,UnidentifiedImageError
    try:
        with Image.open(io.BytesIO(raw)) as image:
            if image.format not in {'JPEG','PNG'} or image.width<16 or image.height<16 or image.width*image.height>16_000_000:
                raise CoachingError('invalid_photo','Use a JPEG or PNG photo up to 16 megapixels.')
            image=ImageOps.exif_transpose(image)
            image.thumbnail((640,640))
            clean=Image.new('RGB',image.size,(255,255,255))
            if image.mode=='RGBA':clean.paste(image,mask=image.getchannel('A'))
            else:clean.paste(image.convert('RGB'))
            output=io.BytesIO();clean.save(output,format='JPEG',quality=80)
            return output.getvalue()
    except CoachingError:raise
    except (OSError,ValueError,UnidentifiedImageError,Image.DecompressionBombError):raise CoachingError('invalid_photo','This photo could not be decoded. Choose a JPEG or PNG image.') from None

def food_context(value):
    if not isinstance(value,dict) or set(value)-{'portionGrams'}:raise CoachingError('invalid_context','Include only optional portion grams.')
    grams=value.get('portionGrams')
    if grams is not None and (isinstance(grams,bool) or not isinstance(grams,(int,float)) or not math.isfinite(grams) or not 1<=grams<=5000):
        raise CoachingError('invalid_context','Portion grams must be between 1 and 5000.')
    return {'portionGrams':grams} if grams is not None else {}

def estimate(path,context):
    jpeg=normalized_photo(path.read_bytes())
    return respond([{'type':'input_text','text':'Estimate this explicitly submitted meal photo.'},{'type':'input_image','detail':'low','image_url':'data:image/jpeg;base64,'+base64.b64encode(jpeg).decode()}],food_context(context),food=True)
