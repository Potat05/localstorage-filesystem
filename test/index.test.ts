
import "./localstorage";
import { CompressionMethod, Directory, EncryptionMethod } from "../src";



(async function() {

    const message = `Culpa aliquip minim qui anim ut in cillum cillum esse incididunt ea fugiat.
Laborum qui nulla ex deserunt dolore ullamco nulla tempor commodo sit.
Eu occaecat mollit sit voluptate.
Esse ipsum cillum voluptate tempor.
Voluptate labore laboris dolore commodo eiusmod mollit.
Exercitation fugiat veniam exercitation exercitation irure id quis enim.

Dolor occaecat dolor irure occaecat reprehenderit amet officia fugiat commodo exercitation ea non laboris sit.
Dolor dolore deserunt veniam sint ullamco in.
Nostrud cupidatat commodo tempor aute minim.
Consequat aute sit consectetur anim dolore cupidatat qui esse dolore elit.
Ex mollit Lorem Lorem ad laborum esse.
Laborum culpa ipsum consectetur occaecat ipsum cillum consectetur laboris.

Eiusmod tempor exercitation nisi occaecat dolor eu voluptate dolore aliqua ex.
Pariatur ipsum fugiat magna ea exercitation duis sint nostrud esse est id tempor est.
In magna sint sint consectetur aliquip proident magna officia cupidatat aliqua excepteur consequat irure ipsum.
Laboris commodo dolore laboris laboris tempor mollit enim aliqua amet labore.
Quis proident fugiat dolor cupidatat fugiat non duis labore id duis commodo voluptate.
Pariatur ea incididunt sint fugiat veniam adipisicing sit ea veniam.
Duis et nostrud dolore dolor occaecat in sunt ullamco fugiat consectetur.

Deserunt enim ad aliqua amet sunt dolore in ut deserunt ipsum culpa veniam id.
Veniam nisi quis enim adipisicing reprehenderit proident consectetur occaecat occaecat ex excepteur incididunt.
Aute exercitation voluptate consectetur proident dolore occaecat anim.
Tempor id ad eu ea qui.
Elit proident reprehenderit dolore in.

Aute eiusmod labore adipisicing quis.
Veniam laborum amet elit velit et eu consectetur ut occaecat proident sint.
Ea occaecat cupidatat in ullamco mollit sunt sint reprehenderit ullamco dolore.`;

    const filename = 'message.txt';

    const password = 'potato';

    const dir = new Directory('fs');

    console.log(dir.set(filename, message, {
        compressionMethod: CompressionMethod.Deflate,
        encryptionMethod: EncryptionMethod.AES_128,
        password: password
    }));

    console.log(dir.toString());

    console.log(dir.get(filename, {
        password: password,
        as: 'string'
    }));

})();
